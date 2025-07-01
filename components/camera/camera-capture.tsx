"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Camera, 
  CameraOff, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Focus, 
  Settings,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react'
import { cameraService, type RealTimeOCRResult } from '@/lib/camera/camera-service'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onRealTimeResult?: (result: RealTimeOCRResult) => void
  enableRealTimeOCR?: boolean
  className?: string
}

export function CameraCapture({ 
  onCapture, 
  onRealTimeResult, 
  enableRealTimeOCR = false,
  className 
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  
  const [isActive, setIsActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageQuality, setImageQuality] = useState(0)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [realTimeResults, setRealTimeResults] = useState<RealTimeOCRResult | null>(null)
  const [detectedFields, setDetectedFields] = useState<Array<{
    name: string
    value: string
    confidence: number
    boundingBox: { x: number; y: number; width: number; height: number }
  }>>([])

  // Initialize camera service
  useEffect(() => {
    if (videoRef.current) {
      cameraService.initialize(videoRef.current)
    }
  }, [])

  // Handle real-time OCR results
  const handleRealTimeResult = useCallback((result: RealTimeOCRResult) => {
    setRealTimeResults(result)
    setDetectedFields(result.detectedFields)
    
    if (onRealTimeResult) {
      onRealTimeResult(result)
    }
  }, [onRealTimeResult])

  // Start camera
  const startCamera = async () => {
    if (!videoRef.current) return

    setIsInitializing(true)
    setError(null)

    try {
      await cameraService.startCamera()
      setIsActive(true)

      // Start real-time OCR if enabled
      if (enableRealTimeOCR) {
        await cameraService.startRealTimeOCR(handleRealTimeResult, 3000)
      }

      // Start quality monitoring
      startQualityMonitoring()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start camera')
    } finally {
      setIsInitializing(false)
    }
  }

  // Stop camera
  const stopCamera = async () => {
    await cameraService.stopCamera()
    setIsActive(false)
    setImageQuality(0)
    setDetectedFields([])
    setRealTimeResults(null)
  }

  // Capture photo
  const capturePhoto = () => {
    const capture = cameraService.captureFrame()
    if (capture) {
      onCapture(capture.imageData)
    }
  }

  // Switch camera (front/back)
  const switchCamera = async () => {
    try {
      await cameraService.switchCamera()
    } catch (err) {
      setError('Failed to switch camera')
    }
  }

  // Toggle torch
  const toggleTorch = async () => {
    try {
      const newState = !torchEnabled
      await cameraService.setTorch(newState)
      setTorchEnabled(newState)
    } catch (err) {
      console.warn('Torch not supported on this device')
    }
  }

  // Monitor image quality
  const startQualityMonitoring = () => {
    const monitor = () => {
      if (isActive) {
        const capture = cameraService.captureFrame()
        if (capture) {
          setImageQuality(capture.quality)
        }
        setTimeout(monitor, 1000) // Check every second
      }
    }
    monitor()
  }

  // Draw field detection overlays
  useEffect(() => {
    if (!overlayRef.current || !videoRef.current || detectedFields.length === 0) return

    const canvas = overlayRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw field detection boxes
    detectedFields.forEach(field => {
      const { boundingBox, confidence } = field
      
      // Color based on confidence
      const color = confidence > 80 ? '#10B981' : confidence > 60 ? '#F59E0B' : '#EF4444'
      
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height)
      
      // Draw field label
      ctx.fillStyle = color
      ctx.font = '14px Arial'
      ctx.fillText(
        `${field.name}: ${field.value} (${confidence.toFixed(0)}%)`,
        boundingBox.x,
        boundingBox.y - 5
      )
    })
  }, [detectedFields])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopCamera()
      }
    }
  }, [isActive])

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-600'
    if (quality >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualityBadge = (quality: number) => {
    if (quality >= 80) return 'default'
    if (quality >= 60) return 'secondary'
    return 'destructive'
  }

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Capture
          </span>
          {enableRealTimeOCR && (
            <Badge variant="outline" className="text-xs">
              Real-time OCR
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Video Preview */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {/* Field detection overlay */}
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Quality indicator */}
          {isActive && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <Badge variant={getQualityBadge(imageQuality)}>
                Quality: {imageQuality}%
              </Badge>
            </div>
          )}

          {/* Real-time results */}
          {enableRealTimeOCR && realTimeResults && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/70 text-white p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span>OCR Confidence: {realTimeResults.confidence.toFixed(1)}%</span>
                  <span>{realTimeResults.processingTime}ms</span>
                </div>
                <div className="text-xs opacity-75 max-h-16 overflow-y-auto">
                  {realTimeResults.text.substring(0, 100)}...
                </div>
              </div>
            </div>
          )}

          {/* Camera not active overlay */}
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Camera not active</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          {!isActive ? (
            <Button 
              onClick={startCamera} 
              disabled={isInitializing}
              className="flex-1 sm:flex-none"
            >
              {isInitializing ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          ) : (
            <>
              <Button onClick={capturePhoto} size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
              
              <Button onClick={stopCamera} variant="outline">
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </Button>
              
              <Button onClick={switchCamera} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button 
                onClick={toggleTorch} 
                variant="outline" 
                size="sm"
                className={torchEnabled ? 'bg-yellow-100' : ''}
              >
                {torchEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>

        {/* Image Quality Indicator */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Image Quality</span>
              <span className={getQualityColor(imageQuality)}>{imageQuality}%</span>
            </div>
            <Progress value={imageQuality} className="w-full" />
            {imageQuality < 60 && (
              <p className="text-xs text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Improve lighting or focus for better OCR accuracy
              </p>
            )}
          </div>
        )}

        {/* Detected Fields Summary */}
        {enableRealTimeOCR && detectedFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Detected Fields</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {detectedFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <span className="font-medium capitalize">
                    {field.name.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-20">{field.value}</span>
                    <Badge variant={getQualityBadge(field.confidence)} className="text-xs">
                      {field.confidence.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Hold the device steady and ensure good lighting</p>
          <p>• Position the ticket to fill most of the frame</p>
          <p>• Wait for the quality indicator to show green before capturing</p>
          {enableRealTimeOCR && (
            <p>• Real-time detection will highlight recognized fields</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}