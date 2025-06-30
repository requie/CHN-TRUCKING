import type Tesseract from "tesseract.js"
import { createWorker, createScheduler, type Worker } from "tesseract.js"

export interface TesseractConfig {
  language: string
  psm: number
  oem: number
  dpi?: number
  whitelist?: string
  blacklist?: string
  preserveInterwordSpaces?: boolean
  tessjs_create_hocr?: boolean
  tessjs_create_tsv?: boolean
}

export interface TesseractResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
  lines: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    words: Array<{
      text: string
      confidence: number
      bbox: { x0: number; y0: number; x1: number; y1: number }
    }>
  }>
  paragraphs: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
  hocr?: string
  tsv?: string
}

export interface ProcessingProgress {
  status: string
  progress: number
  userJobId?: string
}

export interface BatchProgress {
  imageIndex: number
  fileName: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  result?: TesseractResult
  error?: string
  startTime?: number
  endTime?: number
}

export interface BatchJob {
  id: string
  files: File[]
  onProgress: (progress: BatchProgress[]) => void
  onComplete: (results: TesseractResult[]) => void
  onError: (error: string) => void
}

class TesseractService {
  private scheduler: Tesseract.Scheduler | null = null
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null
  private workerPool: Worker[] = []
  private maxWorkers = 3
  private batchQueue: BatchJob[] = []
  private isProcessingBatch = false
  private currentBatchProgress: Map<string, BatchProgress[]> = new Map()

  private defaultConfig: TesseractConfig = {
    language: "eng",
    psm: 6,
    oem: 3,
    dpi: 300,
    preserveInterwordSpaces: true,
    tessjs_create_hocr: false,
    tessjs_create_tsv: false,
  }

  async initialize(config: Partial<TesseractConfig> = {}): Promise<void> {
    if (this.isInitialized) return
    if (this.initializationPromise) return this.initializationPromise

    this.initializationPromise = this.doInitialize(config)
    return this.initializationPromise
  }

  private async doInitialize(config: Partial<TesseractConfig>): Promise<void> {
    try {
      console.log("Initializing Tesseract.js with", this.maxWorkers, "workers...")

      this.scheduler = createScheduler()

      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = await createWorker({
          logger: (m) => {
            // Progress will be handled per job
            if (m.status !== "recognizing text") {
              console.log(`Worker ${i + 1}:`, m)
            }
          },
        })

        const finalConfig = { ...this.defaultConfig, ...config }

        await worker.loadLanguage(finalConfig.language)
        await worker.initialize(finalConfig.language)

        await worker.setParameters({
          tessedit_pageseg_mode: finalConfig.psm.toString(),
          tessedit_ocr_engine_mode: finalConfig.oem.toString(),
          tessedit_char_whitelist: finalConfig.whitelist || "",
          tessedit_char_blacklist: finalConfig.blacklist || "",
          preserve_interword_spaces: finalConfig.preserveInterwordSpaces ? "1" : "0",
        })

        this.workerPool.push(worker)
        this.scheduler.addWorker(worker)
      }

      this.isInitialized = true
      console.log("Tesseract.js initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Tesseract.js:", error)
      throw new Error(`Tesseract initialization failed: ${error}`)
    }
  }

  async processImage(
    imageFile: File | string | ImageData | HTMLCanvasElement,
    config: Partial<TesseractConfig> = {},
    onProgress?: (progress: ProcessingProgress) => void,
  ): Promise<TesseractResult> {
    await this.initialize(config)

    if (!this.scheduler) {
      throw new Error("Tesseract scheduler not initialized")
    }

    try {
      console.log("Starting single image OCR processing...")
      const startTime = Date.now()

      // Process image with scheduler - no logger in options to avoid DataCloneError
      const result = await this.scheduler.addJob("recognize", imageFile)

      const processingTime = Date.now() - startTime
      console.log(`OCR processing completed in ${processingTime}ms`)

      // Extract detailed information
      const words = result.data.words.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox,
      }))

      const lines = result.data.lines.map((line) => ({
        text: line.text,
        confidence: line.confidence,
        bbox: line.bbox,
        words: line.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox,
        })),
      }))

      const paragraphs = result.data.paragraphs.map((paragraph) => ({
        text: paragraph.text,
        confidence: paragraph.confidence,
        bbox: paragraph.bbox,
      }))

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words,
        lines,
        paragraphs,
        hocr: result.data.hocr,
        tsv: result.data.tsv,
      }
    } catch (error) {
      console.error("OCR processing failed:", error)
      throw new Error(`OCR processing failed: ${error}`)
    }
  }

  async processBatch(
    files: File[],
    onProgress: (progress: BatchProgress[]) => void,
    onComplete: (results: TesseractResult[]) => void,
    onError: (error: string) => void,
  ): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const batchJob: BatchJob = {
      id: batchId,
      files,
      onProgress,
      onComplete,
      onError,
    }

    // Initialize progress tracking for this batch
    const initialProgress: BatchProgress[] = files.map((file, index) => ({
      imageIndex: index,
      fileName: file.name,
      status: "queued",
      progress: 0,
    }))

    this.currentBatchProgress.set(batchId, initialProgress)
    onProgress(initialProgress)

    // Add to queue
    this.batchQueue.push(batchJob)

    // Start processing if not already running
    if (!this.isProcessingBatch) {
      this.processBatchQueue()
    }

    return batchId
  }

  private async processBatchQueue(): Promise<void> {
    if (this.isProcessingBatch || this.batchQueue.length === 0) {
      return
    }

    this.isProcessingBatch = true

    while (this.batchQueue.length > 0) {
      const batchJob = this.batchQueue.shift()!
      await this.processSingleBatch(batchJob)
    }

    this.isProcessingBatch = false
  }

  private async processSingleBatch(batchJob: BatchJob): Promise<void> {
    const { id, files, onProgress, onComplete, onError } = batchJob
    const results: TesseractResult[] = []

    try {
      await this.initialize()

      // Process images with controlled concurrency
      const concurrentLimit = Math.min(this.maxWorkers, files.length)
      const processingPromises: Promise<void>[] = []

      for (let i = 0; i < files.length; i += concurrentLimit) {
        const batch = files.slice(i, i + concurrentLimit)
        const batchPromises = batch.map((file, batchIndex) => {
          const globalIndex = i + batchIndex
          return this.processImageInBatch(file, globalIndex, id, onProgress)
        })

        const batchResults = await Promise.allSettled(batchPromises)

        // Collect results in order
        batchResults.forEach((result, batchIndex) => {
          const globalIndex = i + batchIndex
          if (result.status === "fulfilled") {
            results[globalIndex] = result.value
          } else {
            console.error(`Failed to process image ${globalIndex}:`, result.reason)
            results[globalIndex] = {
              text: "",
              confidence: 0,
              words: [],
              lines: [],
              paragraphs: [],
            }

            // Update progress with error
            this.updateBatchProgress(id, globalIndex, {
              status: "failed",
              progress: 0,
              error: result.reason?.message || "Processing failed",
              endTime: Date.now(),
            })
            onProgress(this.currentBatchProgress.get(id) || [])
          }
        })
      }

      console.log(`Batch ${id} completed successfully`)
      onComplete(results)
    } catch (error) {
      console.error(`Batch ${id} failed:`, error)
      onError(error instanceof Error ? error.message : "Batch processing failed")
    } finally {
      // Clean up progress tracking
      this.currentBatchProgress.delete(id)
    }
  }

  private async processImageInBatch(
    file: File,
    imageIndex: number,
    batchId: string,
    onProgress: (progress: BatchProgress[]) => void,
  ): Promise<TesseractResult> {
    // Update status to processing
    this.updateBatchProgress(batchId, imageIndex, {
      status: "processing",
      progress: 0,
      startTime: Date.now(),
    })
    onProgress(this.currentBatchProgress.get(batchId) || [])

    try {
      // Simulate progress updates during processing
      const progressInterval = setInterval(() => {
        const currentProgress = this.currentBatchProgress.get(batchId)?.[imageIndex]
        if (currentProgress && currentProgress.status === "processing") {
          const newProgress = Math.min(currentProgress.progress + Math.random() * 20, 90)
          this.updateBatchProgress(batchId, imageIndex, {
            progress: newProgress,
          })
          onProgress(this.currentBatchProgress.get(batchId) || [])
        }
      }, 500)

      const result = await this.processImage(file)

      clearInterval(progressInterval)

      // Update status to completed
      this.updateBatchProgress(batchId, imageIndex, {
        status: "completed",
        progress: 100,
        result,
        endTime: Date.now(),
      })
      onProgress(this.currentBatchProgress.get(batchId) || [])

      return result
    } catch (error) {
      // Update status to failed
      this.updateBatchProgress(batchId, imageIndex, {
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Processing failed",
        endTime: Date.now(),
      })
      onProgress(this.currentBatchProgress.get(batchId) || [])

      throw error
    }
  }

  private updateBatchProgress(batchId: string, imageIndex: number, updates: Partial<BatchProgress>): void {
    const batchProgress = this.currentBatchProgress.get(batchId)
    if (batchProgress && batchProgress[imageIndex]) {
      Object.assign(batchProgress[imageIndex], updates)
    }
  }

  cancelBatch(batchId: string): void {
    // Remove from queue if not started
    const queueIndex = this.batchQueue.findIndex((job) => job.id === batchId)
    if (queueIndex !== -1) {
      this.batchQueue.splice(queueIndex, 1)
      console.log(`Batch ${batchId} cancelled (removed from queue)`)
    }

    // Clean up progress tracking
    this.currentBatchProgress.delete(batchId)
  }

  getBatchProgress(batchId: string): BatchProgress[] | null {
    return this.currentBatchProgress.get(batchId) || null
  }

  getQueueStatus(): {
    queueLength: number
    isProcessing: boolean
    activeBatches: string[]
  } {
    return {
      queueLength: this.batchQueue.length,
      isProcessing: this.isProcessingBatch,
      activeBatches: Array.from(this.currentBatchProgress.keys()),
    }
  }

  async terminate(): Promise<void> {
    try {
      // Cancel all pending batches
      this.batchQueue.length = 0
      this.currentBatchProgress.clear()
      this.isProcessingBatch = false

      if (this.scheduler) {
        await this.scheduler.terminate()
        this.scheduler = null
      }

      for (const worker of this.workerPool) {
        await worker.terminate()
      }

      this.workerPool = []
      this.isInitialized = false
      this.initializationPromise = null

      console.log("Tesseract.js terminated successfully")
    } catch (error) {
      console.error("Error terminating Tesseract.js:", error)
    }
  }

  // Utility methods for image preprocessing (keeping existing implementation)
  async preprocessImage(
    imageFile: File,
    options: {
      contrast?: number
      brightness?: number
      blur?: number
      sharpen?: boolean
      grayscale?: boolean
      threshold?: number
    } = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i]
          let g = data[i + 1]
          let b = data[i + 2]

          if (options.grayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b
            r = g = b = gray
          }

          if (options.contrast !== undefined || options.brightness !== undefined) {
            const contrast = options.contrast ?? 1
            const brightness = options.brightness ?? 0

            r = Math.max(0, Math.min(255, contrast * (r - 128) + 128 + brightness))
            g = Math.max(0, Math.min(255, contrast * (g - 128) + 128 + brightness))
            b = Math.max(0, Math.min(255, contrast * (b - 128) + 128 + brightness))
          }

          if (options.threshold !== undefined) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b
            const binary = gray > options.threshold ? 255 : 0
            r = g = b = binary
          }

          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
        }

        ctx.putImageData(imageData, 0, 0)

        if (options.blur) {
          ctx.filter = `blur(${options.blur}px)`
          ctx.drawImage(canvas, 0, 0)
          ctx.filter = "none"
        }

        resolve(canvas.toDataURL("image/png"))
      }

      img.onerror = () => {
        reject(new Error("Failed to load image for preprocessing"))
      }

      img.src = URL.createObjectURL(imageFile)
    })
  }

  async analyzeImageQuality(imageFile: File): Promise<{
    needsPreprocessing: boolean
    suggestedSettings: {
      contrast?: number
      brightness?: number
      grayscale?: boolean
      threshold?: number
    }
    quality: "excellent" | "good" | "fair" | "poor"
  }> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        if (!ctx) {
          resolve({
            needsPreprocessing: true,
            suggestedSettings: { grayscale: true, contrast: 1.2 },
            quality: "poor",
          })
          return
        }

        canvas.width = Math.min(img.width, 200)
        canvas.height = Math.min(img.height, 200)

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        let totalBrightness = 0
        let contrastSum = 0
        let pixelCount = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const brightness = (r + g + b) / 3

          totalBrightness += brightness
          pixelCount++
        }

        const avgBrightness = totalBrightness / pixelCount

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const brightness = (r + g + b) / 3
          contrastSum += Math.abs(brightness - avgBrightness)
        }

        const avgContrast = contrastSum / pixelCount

        let quality: "excellent" | "good" | "fair" | "poor" = "excellent"
        let needsPreprocessing = false
        const suggestedSettings: any = {}

        if (avgBrightness < 80) {
          needsPreprocessing = true
          suggestedSettings.brightness = 30
          quality = avgBrightness < 50 ? "poor" : "fair"
        } else if (avgBrightness > 200) {
          needsPreprocessing = true
          suggestedSettings.brightness = -20
          quality = avgBrightness > 230 ? "poor" : "fair"
        }

        if (avgContrast < 30) {
          needsPreprocessing = true
          suggestedSettings.contrast = 1.3
          quality = quality === "excellent" ? "fair" : "poor"
        }

        if (needsPreprocessing) {
          suggestedSettings.grayscale = true
        }

        resolve({
          needsPreprocessing,
          suggestedSettings,
          quality,
        })
      }

      img.onerror = () => {
        resolve({
          needsPreprocessing: true,
          suggestedSettings: { grayscale: true, contrast: 1.2 },
          quality: "poor",
        })
      }

      img.src = URL.createObjectURL(imageFile)
    })
  }

  getWorkerStatus(): Array<{ id: number; busy: boolean }> {
    return this.workerPool.map((worker, index) => ({
      id: index + 1,
      busy: false,
    }))
  }
}

export const tesseractService = new TesseractService()
export default tesseractService
