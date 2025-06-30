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
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"
import { ocrService, type OCRResult, type OCRConfig } from "@/lib/ocr/ocr-service"
import { tesseractService, type BatchProgress } from "@/lib/ocr/tesseract-service"

interface FileWithPreview {
  file: File
  preview: string
  id: string
}

export default function UploadTicketPage() {
  const [uploadStep, setUploadStep] = useState<"upload" | "processing" | "batch" | "ocr" | "manual" | "success">(
    "upload",
  )
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([])
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<OCRResult[]>([])
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [ocrConfig, setOcrConfig] = useState<OCRConfig>(ocrService.getConfig())
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

      const steps = [
        { message: "Uploading file...", progress: 20 },
        { message: "Preprocessing image...", progress: 40 },
        { message: "Running OCR analysis...", progress: 60 },
        { message: "Extracting ticket data...", progress: 80 },
        { message: "Validating results...", progress: 100 },
      ]

      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        setProcessingProgress(step.progress)
      }

      try {
        const result = await ocrService.processImage(files[0])
        setOcrResult(result)

        if (result.success && result.extractedData) {
          const newFormData = { ...formData }
          Object.entries(result.extractedData).forEach(([key, value]) => {
            if (value && value.value) {
              const formKey = key === "truckRegistration" ? "truckReg" : key
              newFormData[formKey as keyof typeof formData] = value.value
            }
          })
          setFormData(newFormData)
        }

        setUploadStep("ocr")
      } catch (error) {
        console.error("OCR processing failed:", error)
        setUploadStep("manual")
      }
    } else {
      // Multiple files - batch processing
      setUploadStep("batch")
      startBatchProcessing(files)
    }
  }

  const startBatchProcessing = async (files: File[]) => {
    try {
      const batchId = await tesseractService.processBatch(
        files,
        (progress) => {
          setBatchProgress(progress)
        },
        (results) => {
          console.log("Batch processing completed:", results)
          // Convert TesseractResult[] to OCRResult[]
          const ocrResults: OCRResult[] = results.map((result, index) => ({
            success: result.text.length > 0,
            text: result.text,
            confidence: result.confidence,
            extractedData: {}, // Would need to extract fields here
            engine: "tesseract",
            processingTime: 0,
          }))
          setBatchResults(ocrResults)
          setUploadStep("success")
        },
        (error) => {
          console.error("Batch processing failed:", error)
          setUploadStep("manual")
        },
      )

      setCurrentBatchId(batchId)
    } catch (error) {
      console.error("Failed to start batch processing:", error)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUploadStep("success")
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  if (uploadStep === "success") {
    return (
      <DashboardLayout userRole="driver">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedFiles.length > 1 ? "Batch Upload Completed!" : "Ticket Uploaded Successfully!"}
              </h2>
              <p className="text-gray-600 mb-6">
                {selectedFiles.length > 1
                  ? `${selectedFiles.length} tickets have been processed and submitted.`
                  : "Your delivery ticket has been submitted and is now pending verification."}
              </p>

              {selectedFiles.length > 1 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Batch Processing Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Files:</span>
                      <span className="ml-2">{selectedFiles.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Successful:</span>
                      <span className="ml-2 text-green-600">
                        {batchProgress.filter((p) => p.status === "completed").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Failed:</span>
                      <span className="ml-2 text-red-600">
                        {batchProgress.filter((p) => p.status === "failed").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Processing Time:</span>
                      <span className="ml-2">
                        {batchProgress.length > 0 &&
                          batchProgress[0].startTime &&
                          batchProgress[batchProgress.length - 1].endTime &&
                          `${Math.round(
                            (batchProgress[batchProgress.length - 1].endTime! - batchProgress[0].startTime!) / 1000,
                          )}s`}
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
                  Upload More Tickets
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

                {/* Queue Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium text-blue-900">Queued</h3>
                    <p className="text-sm text-blue-700">
                      {batchProgress.filter((p) => p.status === "queued").length} files
                    </p>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Brain className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <h3 className="font-medium text-yellow-900">Processing</h3>
                    <p className="text-sm text-yellow-700">
                      {batchProgress.filter((p) => p.status === "processing").length} files
                    </p>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-green-900">Completed</h3>
                    <p className="text-sm text-green-700">
                      {batchProgress.filter((p) => p.status === "completed").length} files
                    </p>
                  </div>
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
                Processing Your Ticket
              </CardTitle>
              <CardDescription>Our AI is analyzing your ticket image and extracting the data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Progress value={processingProgress} className="w-full" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium text-blue-900">AI Analysis</h3>
                    <p className="text-sm text-blue-700">Advanced OCR processing</p>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-green-900">Data Extraction</h3>
                    <p className="text-sm text-green-700">Identifying key fields</p>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-medium text-purple-900">Validation</h3>
                    <p className="text-sm text-purple-700">Ensuring accuracy</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">This usually takes 10-30 seconds depending on image quality</p>
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
            Upload single or multiple ticket images for batch processing with individual progress tracking
          </p>
        </div>

        {uploadStep === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Ticket Images</CardTitle>
              <CardDescription>
                Upload one or more images of your delivery tickets (JPG, PNG, PDF). Multiple files will be processed in
                batch with individual progress tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload Files</TabsTrigger>
                  <TabsTrigger value="settings">OCR Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
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
                      <Camera className="h-4 w-4 mr-2" />
                      {selectedFiles.length > 1 ? `Process ${selectedFiles.length} Files` : "Process with AI OCR"}
                    </Button>
                    <Button variant="outline" onClick={handleManualEntry}>
                      Manual Entry Instead
                    </Button>
                  </div>

                  {selectedFiles.length > 1 && (
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        Batch mode detected! {selectedFiles.length} files will be processed simultaneously with
                        individual progress tracking. This may take several minutes depending on image quality and
                        complexity.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="engine">OCR Engine</Label>
                      <Select
                        value={ocrConfig.engine}
                        onValueChange={(value: any) => setOcrConfig((prev) => ({ ...prev, engine: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tesseract">Tesseract (Free)</SelectItem>
                          <SelectItem value="google-vision">Google Vision (Premium)</SelectItem>
                          <SelectItem value="azure-vision">Azure Vision (Premium)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={ocrConfig.language}
                        onValueChange={(value) => setOcrConfig((prev) => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eng">English</SelectItem>
                          <SelectItem value="spa">Spanish</SelectItem>
                          <SelectItem value="fra">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="psm">Page Segmentation Mode</Label>
                      <Select
                        value={ocrConfig.psm.toString()}
                        onValueChange={(value) => setOcrConfig((prev) => ({ ...prev, psm: Number.parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">Uniform block of text (Default)</SelectItem>
                          <SelectItem value="7">Single text line</SelectItem>
                          <SelectItem value="8">Single word</SelectItem>
                          <SelectItem value="11">Sparse text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dpi">DPI Setting</Label>
                      <Select
                        value={ocrConfig.dpi?.toString() || "300"}
                        onValueChange={(value) => setOcrConfig((prev) => ({ ...prev, dpi: Number.parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="150">150 DPI (Fast)</SelectItem>
                          <SelectItem value="300">300 DPI (Balanced)</SelectItem>
                          <SelectItem value="600">600 DPI (High Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Higher DPI settings provide better accuracy but take longer to process. For batch processing,
                      consider using 300 DPI for the best balance of speed and accuracy.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Keep existing OCR and manual entry sections */}
        {uploadStep === "ocr" && ocrResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                OCR Processing Complete
              </CardTitle>
              <CardDescription>Please review and verify the extracted information below</CardDescription>
            </CardHeader>
            <CardContent>
              {/* OCR Results Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Engine:</span>
                    <span className="ml-2 capitalize font-medium">{ocrResult.engine}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Processing Time:</span>
                    <span className="ml-2 font-medium">{ocrResult.processingTime}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Overall Confidence:</span>
                    <Badge variant={getConfidenceBadge(ocrResult.confidence)} className="ml-2">
                      {ocrResult.confidence.toFixed(1)}%
                    </Badge>
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setUploadStep("upload")}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reprocess
                    </Button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData).map(([field, value]) => {
                    const ocrField = ocrResult.extractedData[field === "truckReg" ? "truckRegistration" : field]
                    const confidence = ocrField?.confidence || 0
                    const isManualOverride = manualOverrides[field]

                    return (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={field} className="flex items-center gap-2">
                          {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
                          {ocrField && (
                            <Badge variant={getConfidenceBadge(confidence)} className="text-xs">
                              {confidence.toFixed(0)}%
                            </Badge>
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
