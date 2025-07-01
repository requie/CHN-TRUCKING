// Camera service for real-time OCR preview
export interface CameraConfig {
  facingMode: 'user' | 'environment'
  width: number
  height: number
  frameRate: number
}

export interface CameraCapture {
  imageData: string
  timestamp: number
  quality: number
}

export interface RealTimeOCRResult {
  text: string
  confidence: number
  detectedFields: Array<{
    name: string
    value: string
    confidence: number
    boundingBox: { x: number; y: number; width: number; height: number }
  }>
  processingTime: number
}

class CameraService {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null
  private isStreaming = false
  private animationFrame: number | null = null
  private ocrWorker: Worker | null = null

  private config: CameraConfig = {
    facingMode: 'environment', // Back camera for document scanning
    width: 1280,
    height: 720,
    frameRate: 30
  }

  async initialize(videoElement: HTMLVideoElement, config?: Partial<CameraConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    this.video = videoElement
    
    // Create canvas for frame capture
    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')

    if (!this.context) {
      throw new Error('Could not get canvas context')
    }

    console.log('Camera service initialized')
  }

  async startCamera(): Promise<void> {
    if (!this.video) {
      throw new Error('Video element not initialized')
    }

    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.config.facingMode,
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          frameRate: { ideal: this.config.frameRate }
        },
        audio: false
      })

      this.video.srcObject = this.stream
      this.video.play()

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        this.video!.onloadedmetadata = () => {
          this.canvas!.width = this.video!.videoWidth
          this.canvas!.height = this.video!.videoHeight
          this.isStreaming = true
          resolve()
        }
      })

      console.log('Camera started successfully')
    } catch (error) {
      console.error('Failed to start camera:', error)
      throw new Error(`Camera access failed: ${error}`)
    }
  }

  async stopCamera(): Promise<void> {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.video) {
      this.video.srcObject = null
    }

    this.isStreaming = false
    console.log('Camera stopped')
  }

  captureFrame(): CameraCapture | null {
    if (!this.isStreaming || !this.video || !this.canvas || !this.context) {
      return null
    }

    // Draw current video frame to canvas
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
    
    // Get image data
    const imageData = this.canvas.toDataURL('image/jpeg', 0.8)
    
    // Calculate image quality (simple brightness/contrast analysis)
    const quality = this.analyzeImageQuality()

    return {
      imageData,
      timestamp: Date.now(),
      quality
    }
  }

  private analyzeImageQuality(): number {
    if (!this.context || !this.canvas) return 0

    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data
    
    let totalBrightness = 0
    let contrastSum = 0
    let pixelCount = 0

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / 3
      
      totalBrightness += brightness
      pixelCount++
    }

    const avgBrightness = totalBrightness / pixelCount

    // Calculate contrast
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / 3
      contrastSum += Math.abs(brightness - avgBrightness)
    }

    const avgContrast = contrastSum / pixelCount

    // Quality score based on brightness and contrast
    let quality = 100

    // Penalize poor lighting
    if (avgBrightness < 80 || avgBrightness > 200) {
      quality -= 30
    }

    // Penalize low contrast
    if (avgContrast < 30) {
      quality -= 40
    }

    return Math.max(0, quality)
  }

  async startRealTimeOCR(
    onResult: (result: RealTimeOCRResult) => void,
    interval: number = 2000 // Process every 2 seconds
  ): Promise<void> {
    if (!this.isStreaming) {
      throw new Error('Camera not started')
    }

    const processFrame = async () => {
      const capture = this.captureFrame()
      
      if (capture && capture.quality > 50) { // Only process good quality frames
        try {
          const result = await this.processFrameForOCR(capture.imageData)
          onResult(result)
        } catch (error) {
          console.warn('OCR processing failed for frame:', error)
        }
      }

      // Schedule next processing
      setTimeout(() => {
        if (this.isStreaming) {
          processFrame()
        }
      }, interval)
    }

    // Start processing
    processFrame()
  }

  private async processFrameForOCR(imageData: string): Promise<RealTimeOCRResult> {
    const startTime = Date.now()

    // Import OCR service dynamically to avoid circular dependencies
    const { ocrService } = await import('../ocr/ocr-service')
    const { mlFieldDetector } = await import('../ml/field-detector')

    // Convert data URL to File for OCR processing
    const response = await fetch(imageData)
    const blob = await response.blob()
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })

    // Process with OCR
    const ocrResult = await ocrService.processImage(file)
    
    // Enhance with ML field detection
    const mlDetections = await mlFieldDetector.detectFields(imageData, ocrResult.text)

    const detectedFields = mlDetections.map(detection => ({
      name: detection.fieldName,
      value: detection.value,
      confidence: detection.confidence,
      boundingBox: detection.boundingBox
    }))

    return {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      detectedFields,
      processingTime: Date.now() - startTime
    }
  }

  // Camera controls
  async switchCamera(): Promise<void> {
    const newFacingMode = this.config.facingMode === 'user' ? 'environment' : 'user'
    this.config.facingMode = newFacingMode
    
    await this.stopCamera()
    await this.startCamera()
  }

  async setResolution(width: number, height: number): Promise<void> {
    this.config.width = width
    this.config.height = height
    
    if (this.isStreaming) {
      await this.stopCamera()
      await this.startCamera()
    }
  }

  // Utility methods
  getCapabilities(): MediaTrackCapabilities | null {
    if (!this.stream) return null
    
    const videoTrack = this.stream.getVideoTracks()[0]
    return videoTrack.getCapabilities()
  }

  getSettings(): MediaTrackSettings | null {
    if (!this.stream) return null
    
    const videoTrack = this.stream.getVideoTracks()[0]
    return videoTrack.getSettings()
  }

  async applyConstraints(constraints: MediaTrackConstraints): Promise<void> {
    if (!this.stream) return
    
    const videoTrack = this.stream.getVideoTracks()[0]
    await videoTrack.applyConstraints(constraints)
  }

  // Focus and exposure controls (if supported)
  async setFocus(mode: 'auto' | 'manual', distance?: number): Promise<void> {
    const constraints: MediaTrackConstraints = {
      focusMode: mode
    }

    if (mode === 'manual' && distance !== undefined) {
      constraints.focusDistance = distance
    }

    await this.applyConstraints(constraints)
  }

  async setExposure(mode: 'auto' | 'manual', compensation?: number): Promise<void> {
    const constraints: MediaTrackConstraints = {
      exposureMode: mode
    }

    if (mode === 'manual' && compensation !== undefined) {
      constraints.exposureCompensation = compensation
    }

    await this.applyConstraints(constraints)
  }

  // Torch/flashlight control
  async setTorch(enabled: boolean): Promise<void> {
    await this.applyConstraints({
      torch: enabled
    })
  }

  isStreamingActive(): boolean {
    return this.isStreaming
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video
  }
}

export const cameraService = new CameraService()
export default cameraService