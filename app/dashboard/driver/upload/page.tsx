"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Upload,
  Camera,
  FileText,
  CheckCircle,
  AlertCircle,
  Settings,
  Eye,
  RefreshCw,
  Zap,
  Brain,
  Target,
  X,
  Clock,
  Sparkles,
  Download,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"
import { CameraCapture } from "@/components/camera/camera-capture"
import { enhancedOCRService, type EnhancedOCRResult } from "@/lib/ocr/enhanced-ocr-service"
import { tesseractService, type BatchProgress } from "@/lib/ocr/tesseract-service"
import type { RealTimeOCRResult } from "@/lib/camera/camera-service"

interface FileWithPreview {
  file: File
  preview: string
  id: string
}

interface ProcessedTicket {
  no: string
  date: string
  commodity: string
  truckRegNo: string
  loadingLocation: string
  destination: string
  driver: string
  dispatcher: string
  tons: string
  confidence: number
  source: string
}

export default function UploadTicketPage() {
  const [uploadStep, setUploadStep] = useState<"upload" | "camera" | "processing" | "batch" | "ocr" | "manual" | "success">(
    "upload",
  )
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([])
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<ProcessedTicket[]>([])
  const [ocrResult, setOcrResult] = useState<EnhancedOCRResult | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [realTimeResults, setRealTimeResults] = useState<RealTimeOCRResult | null>(null)
  const [formData, setFormData] = useState({
    ticketNumber: "",
    date: "",
    truckReg: "",
    driverName: "",
    commodity: "",
    loadingLocation: "",
    destination: "",
    dispatcher: "",
    weight: "",
  })
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({})
  const [useEnhancedOCR, setUseEnhancedOCR] = useState(true)
  const router = useRouter()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length === 0) return

    // Create file previews
    const filesWithPreviews: FileWithPreview[] = await Promise.all(
      files.map(async (file) => {
        const preview = URL.createObjectURL(file)
        return {
          file,
          preview,
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }
      }),
    )

    setSelectedFiles(filesWithPreviews)

    if (files.length === 1) {
      // Single file processing
      setUploadStep("processing")
      setProcessingProgress(0)

      try {
        const result = useEnhancedOCR 
          ? await enhancedOCRService.processImageWithML(files[0], (progress) => {
              setProcessingProgress(progress.progress)
            })
          : await enhancedOCRService.processImageWithML(files[0]) // Fallback to basic OCR

        setOcrResult(result)

        if (result.success && result.fieldValidations) {
          const newFormData = { ...formData }
          Object.entries(result.fieldValidations).forEach(([key, validation]) => {
            if (validation.finalValue) {
              const formKey = key === "truckRegistration" ? "truckReg" : key
              newFormData[formKey as keyof typeof formData] = validation.finalValue
            }
          })
          setFormData(newFormData)
        }

        setUploadStep("ocr")
      } catch (error) {
        console.error("Enhanced OCR processing failed:", error)
        setUploadStep("manual")
      }
    } else {
      // Multiple files - batch processing
      setUploadStep("batch")
      startBatchProcessing(files)
    }
  }

  const handleCameraCapture = async (imageData: string) => {
    setUploadStep("processing")
    setProcessingProgress(0)

    try {
      // Convert data URL to File
      const response = await fetch(imageData)
      const blob = await response.blob()
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })

      const result = await enhancedOCRService.processImageWithML(file, (progress) => {
        setProcessingProgress(progress.progress)
      })

      setOcrResult(result)

      if (result.success && result.fieldValidations) {
        const newFormData = { ...formData }
        Object.entries(result.fieldValidations).forEach(([key, validation]) => {
          if (validation.finalValue) {
            const formKey = key === "truckRegistration" ? "truckReg" : key
            newFormData[formKey as keyof typeof formData] = validation.finalValue
          }
        })
        setFormData(newFormData)
      }

      setUploadStep("ocr")
    } catch (error) {
      console.error("Camera OCR processing failed:", error)
      setUploadStep("manual")
    }
  }

  const handleRealTimeOCR = (result: RealTimeOCRResult) => {
    setRealTimeResults(result)
    
    // Auto-fill form with high-confidence detections
    if (result.detectedFields.length > 0) {
      const newFormData = { ...formData }
      let hasHighConfidenceFields = false

      result.detectedFields.forEach(field => {
        if (field.confidence > 85) { // Only use very high confidence results
          const formKey = field.name === "truckRegistration" ? "truckReg" : field.name
          if (formKey in newFormData) {
            newFormData[formKey as keyof typeof formData] = field.value
            hasHighConfidenceFields = true
          }
        }
      })

      if (hasHighConfidenceFields) {
        setFormData(newFormData)
      }
    }
  }

  const startBatchProcessing = async (files: File[]) => {
    try {
      // Use enhanced OCR service for batch processing
      const results = await enhancedOCRService.processBatchWithML(
        files,
        (fileIndex, progress) => {
          // Update batch progress
          setBatchProgress(prev => {
            const updated = [...prev]
            if (!updated[fileIndex]) {
              updated[fileIndex] = {
                imageIndex: fileIndex,
                fileName: files[fileIndex].name,
                status: "processing",
                progress: progress.progress,
                startTime: Date.now()
              }
            } else {
              updated[fileIndex] = {
                ...updated[fileIndex],
                progress: progress.progress,
                status: progress.progress === 100 ? "completed" : "processing"
              }
            }
            return updated
          })
        }
      )

      // Convert results to ProcessedTicket format
      const processedTickets: ProcessedTicket[] = results.map((result, index) => {
        if (!result.success) {
          return {
            no: "Unknown",
            date: "",
            commodity: "",
            truckRegNo: "",
            loadingLocation: "",
            destination: "",
            driver: "",
            dispatcher: "",
            tons: "",
            confidence: 0,
            source: "Error"
          }
        }

        const validations = result.fieldValidations || {}
        return {
          no: validations.ticketNumber?.finalValue || "Unknown",
          date: validations.date?.finalValue || "",
          commodity: validations.commodity?.finalValue || "",
          truckRegNo: validations.truckRegistration?.finalValue || "",
          loadingLocation: validations.loadingLocation?.finalValue || "",
          destination: validations.destination?.finalValue || "",
          driver: validations.driverName?.finalValue || "",
          dispatcher: validations.dispatcher?.finalValue || "",
          tons: validations.weight?.finalValue || "",
          confidence: result.hybridConfidence || result.confidence,
          source: useEnhancedOCR ? "Enhanced AI" : "OCR"
        }
      })

      setBatchResults(processedTickets)
      setUploadStep("success")
    } catch (error) {
      console.error("Batch processing failed:", error)
      setUploadStep("manual")
    }
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId)
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find((f) => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return updated
    })
  }

  const cancelBatch = () => {
    if (currentBatchId) {
      tesseractService.cancelBatch(currentBatchId)
      setCurrentBatchId(null)
    }
    setBatchProgress([])
    setUploadStep("upload")
  }

  const handleManualEntry = () => {
    setUploadStep("manual")
  }

  const handleFieldOverride = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
    setManualOverrides((prev) => ({ ...prev, [fieldName]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If we have OCR result and user made corrections, improve the model
    if (ocrResult && Object.keys(manualOverrides).length > 0) {
      const corrections: Record<string, string> = {}
      Object.entries(manualOverrides).forEach(([field, isOverridden]) => {
        if (isOverridden) {
          corrections[field] = formData[field as keyof typeof formData]
        }
      })
      
      // Send feedback to improve ML model
      if (selectedFiles.length > 0) {
        await enhancedOCRService.improveFromUserFeedback(selectedFiles[0].file, corrections)
      }
    }
    
    // Convert single result to ProcessedTicket format
    const processedTicket: ProcessedTicket = {
      no: formData.ticketNumber || "Unknown",
      date: formData.date,
      commodity: formData.commodity,
      truckRegNo: formData.truckReg,
      loadingLocation: formData.loadingLocation,
      destination: formData.destination,
      driver: formData.driverName,
      dispatcher: formData.dispatcher,
      tons: formData.weight,
      confidence: ocrResult?.hybridConfidence || ocrResult?.confidence || 100,
      source: ocrResult ? (useEnhancedOCR ? "Enhanced AI" : "OCR") : "Manual"
    }
    
    setBatchResults([processedTicket])
    setUploadStep("success")
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const exportData = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const headers = ['No.', 'Date', 'Commodity', 'Truck Reg. No.', 'Loading Location', 'Destination', 'Driver', 'Dispatcher', 'Tons']
      const csvContent = [
        headers.join(','),
        ...batchResults.map(ticket => [
          ticket.no,
          ticket.date,
          ticket.commodity,
          ticket.truckRegNo,
          ticket.loadingLocation,
          ticket.destination,
          ticket.driver,
          ticket.dispatcher,
          ticket.tons
        ].map(field => `"${field}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trucking-tickets-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(batchResults, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trucking-tickets-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const getStatusColor = (status: BatchProgress["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "processing":
        return "text-blue-600"
      case "failed":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusBadge = (status: BatchProgress["status"]) => {
    switch (status) {
      case "completed":
        return "default"
      case "processing":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600"
    if (confidence >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return "default"
    if (confidence >= 60) return "secondary"
    return "destructive"
  }

  const getSourceIcon = (source: 'ocr' | 'ml' | 'hybrid') => {
    switch (source) {
      case 'ml':
        return <Brain className="h-3 w-3" />
      case 'hybrid':
        return <Sparkles className="h-3 w-3" />
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  if (uploadStep === "success") {
    return (
      <DashboardLayout userRole="driver">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                {batchResults.length > 1 ? "Batch Processing Complete!" : "Ticket Processing Complete!"}
              </CardTitle>
              <CardDescription>
                {batchResults.length > 1
                  ? `${batchResults.length} tickets have been processed and are ready for review.`
                  : "Your delivery ticket has been processed and is ready for submission."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Options */}
              <div className="flex gap-4 justify-between items-center">
                <div className="flex gap-2">
                  <Button onClick={() => exportData('csv')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={() => exportData('json')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
                <Badge variant="secondary">
                  {batchResults.length} ticket{batchResults.length !== 1 ? 's' : ''} processed
                </Badge>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Commodity</TableHead>
                      <TableHead>Truck Reg. No.</TableHead>
                      <TableHead>Loading Location</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Dispatcher</TableHead>
                      <TableHead>Tons</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchResults.map((ticket, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{ticket.no}</TableCell>
                        <TableCell>{ticket.date}</TableCell>
                        <TableCell>{ticket.commodity}</TableCell>
                        <TableCell>{ticket.truckRegNo}</TableCell>
                        <TableCell>{ticket.loadingLocation}</TableCell>
                        <TableCell>{ticket.destination}</TableCell>
                        <TableCell>{ticket.driver}</TableCell>
                        <TableCell>{ticket.dispatcher}</TableCell>
                        <TableCell>{ticket.tons}</TableCell>
                        <TableCell>
                          <Badge variant={getConfidenceBadge(ticket.confidence)}>
                            {ticket.confidence.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{batchResults.length}</div>
                    <p className="text-xs text-muted-foreground">Total Tickets</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {batchResults.filter(t => t.confidence >= 80).length}
                    </div>
                    <p className="text-xs text-muted-foreground">High Confidence</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {batchResults.reduce((sum, t) => sum + (parseFloat(t.tons) || 0), 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Tons</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {(batchResults.reduce((sum, t) => sum + t.confidence, 0) / batchResults.length).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Confidence</p>
                  </CardContent>
                </Card>
              </div>

              {useEnhancedOCR && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Enhanced AI Processing Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Processing Mode:</span>
                      <span className="ml-2 font-medium">Enhanced AI</span>
                    </div>
                    <div>
                      <span className="text-gray-500">ML Detections:</span>
                      <span className="ml-2 font-medium">
                        {batchResults.filter(t => t.source.includes('AI')).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fields Detected:</span>
                      <span className="ml-2 font-medium">
                        {batchResults.reduce((sum, t) => {
                          return sum + Object.values(t).filter(v => v && v !== "Unknown" && v !== "").length - 2 // Exclude confidence and source
                        }, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Success Rate:</span>
                      <span className="ml-2 font-medium">
                        {((batchResults.filter(t => t.confidence > 70).length / batchResults.length) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setUploadStep("upload")
                    setSelectedFiles([])
                    setBatchProgress([])
                    setBatchResults([])
                    setOcrResult(null)
                    setRealTimeResults(null)
                    setCurrentBatchId(null)
                    setFormData({
                      ticketNumber: "",
                      date: "",
                      truckReg: "",
                      driverName: "",
                      commodity: "",
                      loadingLocation: "",
                      destination: "",
                      dispatcher: "",
                      weight: "",
                    })
                    setManualOverrides({})
                  }}
                >
                  Process More Tickets
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/driver")}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (uploadStep === "batch") {
    return (
      <DashboardLayout userRole="driver">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processing Batch ({selectedFiles.length} files)
              </CardTitle>
              <CardDescription>Processing multiple ticket images with individual progress tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>
                      {batchProgress.filter((p) => p.status === "completed").length} / {batchProgress.length} completed
                    </span>
                  </div>
                  <Progress
                    value={
                      batchProgress.length > 0
                        ? (batchProgress.filter((p) => p.status === "completed").length / batchProgress.length) * 100
                        : 0
                    }
                    className="w-full"
                  />
                </div>

                {/* Individual File Progress */}
                <div className="space-y-4">
                  <h3 className="font-medium">Individual File Progress</h3>
                  {batchProgress.map((progress, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{progress.fileName}</span>
                          <Badge variant={getStatusBadge(progress.status)}>{progress.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {progress.status === "processing" && <RefreshCw className="h-4 w-4 animate-spin" />}
                          {progress.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {progress.status === "failed" && <AlertCircle className="h-4 w-4 text-red-500" />}
                          {progress.startTime && progress.endTime && (
                            <span>{Math.round((progress.endTime - progress.startTime) / 1000)}s</span>
                          )}
                        </div>
                      </div>

                      {progress.status === "processing" && (
                        <div className="space-y-1">
                          <Progress value={progress.progress} className="w-full h-2" />
                          <p className="text-xs text-gray-500">{progress.progress.toFixed(0)}% complete</p>
                        </div>
                      )}

                      {progress.status === "failed" && progress.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{progress.error}</AlertDescription>
                        </Alert>
                      )}

                      {progress.status === "completed" && progress.result && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span>OCR Confidence: {progress.result.confidence.toFixed(1)}%</span>
                            <span>Text extracted: {progress.result.text.length} characters</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={cancelBatch}>
                    Cancel Batch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (uploadStep === "processing") {
    return (
      <DashboardLayout userRole="driver">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                {useEnhancedOCR ? "Enhanced AI Processing" : "Processing Your Ticket"}
              </CardTitle>
              <CardDescription>
                {useEnhancedOCR 
                  ? "Using advanced ML algorithms and OCR for maximum accuracy"
                  : "Our AI is analyzing your ticket image and extracting the data"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Progress value={processingProgress} className="w-full" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium text-blue-900">OCR Analysis</h3>
                    <p className="text-sm text-blue-700">Text recognition</p>
                  </div>

                  {useEnhancedOCR && (
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <h3 className="font-medium text-purple-900">ML Detection</h3>
                      <p className="text-sm text-purple-700">Field identification</p>
                    </div>
                  )}

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Sparkles className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-green-900">
                      {useEnhancedOCR ? "Hybrid Fusion" : "Validation"}
                    </h3>
                    <p className="text-sm text-green-700">
                      {useEnhancedOCR ? "Combining results" : "Ensuring accuracy"}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {useEnhancedOCR 
                      ? "Enhanced processing may take longer but provides superior accuracy"
                      : "This usually takes 10-30 seconds depending on image quality"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="driver">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Delivery Tickets</h1>
          <p className="text-gray-600 mt-2">
            Upload images, use camera capture, or enter ticket information manually with AI-powered assistance
          </p>
        </div>

        {uploadStep === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upload Method</span>
                <div className="flex items-center gap-2">
                  <Badge variant={useEnhancedOCR ? "default" : "outline"} className="text-xs">
                    {useEnhancedOCR ? "Enhanced AI" : "Standard OCR"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseEnhancedOCR(!useEnhancedOCR)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Choose your preferred method to upload ticket information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="files" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="files">Upload Files</TabsTrigger>
                  <TabsTrigger value="camera">Camera Capture</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>

                <TabsContent value="files" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Drop your files here, or click to browse</p>
                      <p className="text-sm text-gray-500">
                        Supports JPG, PNG, PDF up to 10MB each. Select multiple files for batch processing.
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Selected Files ({selectedFiles.length}):</h4>
                        {selectedFiles.length > 1 && <Badge variant="secondary">Batch Processing Mode</Badge>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedFiles.map((fileWithPreview) => (
                          <div key={fileWithPreview.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{fileWithPreview.file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(fileWithPreview.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileWithPreview.id)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {fileWithPreview.file.type.startsWith("image/") && (
                              <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                                <img
                                  src={fileWithPreview.preview || "/placeholder.svg"}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            {fileWithPreview.file.type === "application/pdf" && (
                              <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button className="flex-1" disabled={selectedFiles.length === 0}>
                      {useEnhancedOCR && <Sparkles className="h-4 w-4 mr-2" />}
                      {selectedFiles.length > 1 
                        ? `Process ${selectedFiles.length} Files` 
                        : useEnhancedOCR 
                          ? "Process with Enhanced AI" 
                          : "Process with AI OCR"
                      }
                    </Button>
                    <Button variant="outline" onClick={handleManualEntry}>
                      Manual Entry Instead
                    </Button>
                  </div>

                  {useEnhancedOCR && (
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        Enhanced AI mode combines traditional OCR with machine learning for superior field detection 
                        and accuracy. Processing may take slightly longer but provides better results.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="camera" className="space-y-4">
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onRealTimeResult={handleRealTimeOCR}
                    enableRealTimeOCR={true}
                  />

                  {realTimeResults && realTimeResults.detectedFields.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Real-time Detection Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {realTimeResults.detectedFields.map((field, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <span className="font-medium capitalize">
                                {field.name.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-20">{field.value}</span>
                                <Badge variant={getConfidenceBadge(field.confidence)} className="text-xs">
                                  {field.confidence.toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Manual entry mode. You can still use camera or file upload for assistance.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleManualEntry} className="w-full">
                    Continue to Manual Entry
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Keep existing OCR and manual entry sections with enhanced features */}
        {uploadStep === "ocr" && ocrResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {useEnhancedOCR ? "Enhanced AI Processing Complete" : "OCR Processing Complete"}
              </CardTitle>
              <CardDescription>Please review and verify the extracted information below</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Enhanced OCR Results Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Engine:</span>
                    <span className="ml-2 capitalize font-medium">
                      {useEnhancedOCR ? "Enhanced AI" : ocrResult.engine}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Processing Time:</span>
                    <span className="ml-2 font-medium">{ocrResult.processingTime}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-500">
                      {useEnhancedOCR ? "Hybrid Confidence:" : "OCR Confidence:"}
                    </span>
                    <Badge variant={getConfidenceBadge(
                      useEnhancedOCR ? ocrResult.hybridConfidence : ocrResult.confidence
                    )} className="ml-2">
                      {(useEnhancedOCR ? ocrResult.hybridConfidence : ocrResult.confidence).toFixed(1)}%
                    </Badge>
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setUploadStep("upload")}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reprocess
                    </Button>
                  </div>
                </div>

                {useEnhancedOCR && ocrResult.mlDetections.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">ML Detections: {ocrResult.mlDetections.length}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Enhanced processing detected {ocrResult.mlDetections.length} fields using machine learning
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData).map(([field, value]) => {
                    const validation = useEnhancedOCR ? ocrResult.fieldValidations[field] : null
                    const confidence = validation?.confidence || 0
                    const source = validation?.source || 'ocr'
                    const isManualOverride = manualOverrides[field]

                    return (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={field} className="flex items-center gap-2">
                          {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
                          {validation && (
                            <div className="flex items-center gap-1">
                              <Badge variant={getConfidenceBadge(confidence)} className="text-xs">
                                {confidence.toFixed(0)}%
                              </Badge>
                              {useEnhancedOCR && (
                                <div className="flex items-center gap-1" title={`Source: ${source}`}>
                                  {getSourceIcon(source)}
                                </div>
                              )}
                            </div>
                          )}
                          {isManualOverride && (
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                          )}
                        </Label>

                        {field === "commodity" ? (
                          <Select value={value} onValueChange={(newValue) => handleFieldOverride(field, newValue)}>
                            <SelectTrigger className={confidence < 60 ? "border-yellow-300" : ""}>
                              <SelectValue placeholder="Select commodity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bauxite">Bauxite</SelectItem>
                              <SelectItem value="Alumina">Alumina</SelectItem>
                              <SelectItem value="Coal">Coal</SelectItem>
                              <SelectItem value="Limestone">Limestone</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : field === "date" ? (
                          <Input
                            id={field}
                            type="date"
                            value={value}
                            onChange={(e) => handleFieldOverride(field, e.target.value)}
                            className={confidence < 60 ? "border-yellow-300" : ""}
                            required
                          />
                        ) : field === "weight" ? (
                          <Input
                            id={field}
                            type="number"
                            step="0.1"
                            value={value}
                            onChange={(e) => handleFieldOverride(field, e.target.value)}
                            className={confidence < 60 ? "border-yellow-300" : ""}
                            required
                          />
                        ) : (
                          <Input
                            id={field}
                            value={value}
                            onChange={(e) => handleFieldOverride(field, e.target.value)}
                            className={confidence < 60 ? "border-yellow-300" : ""}
                            required
                          />
                        )}

                        {confidence < 60 && (
                          <p className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Low confidence - please verify this field
                          </p>
                        )}

                        {useEnhancedOCR && validation && validation.ocrValue !== validation.mlValue && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>OCR: {validation.ocrValue || 'Not detected'}</div>
                            <div>ML: {validation.mlValue || 'Not detected'}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Raw OCR Text Preview */}
                <div className="mt-6">
                  <Label className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4" />
                    Raw OCR Text
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border text-sm font-mono max-h-32 overflow-y-auto">
                    {ocrResult.text || "No text extracted"}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Submit Ticket
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setUploadStep("upload")}>
                    Back to Upload
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {uploadStep === "manual" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Manual Entry
              </CardTitle>
              <CardDescription>Please fill in all the ticket information manually</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData).map(([field, value]) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field}>
                        {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")} *
                      </Label>

                      {field === "commodity" ? (
                        <Select value={value} onValueChange={(newValue) => handleInputChange(field, newValue)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select commodity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bauxite">Bauxite</SelectItem>
                            <SelectItem value="Alumina">Alumina</SelectItem>
                            <SelectItem value="Coal">Coal</SelectItem>
                            <SelectItem value="Limestone">Limestone</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : field === "date" ? (
                        <Input
                          id={field}
                          type="date"
                          value={value}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          required
                        />
                      ) : field === "weight" ? (
                        <Input
                          id={field}
                          type="number"
                          step="0.1"
                          placeholder="Enter weight in tons"
                          value={value}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          required
                        />
                      ) : (
                        <Input
                          id={field}
                          placeholder={`Enter ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`}
                          value={value}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          required
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Submit Ticket
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setUploadStep("upload")}>
                    Back to Upload
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}