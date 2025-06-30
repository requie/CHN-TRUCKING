"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Play,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  FileText,
  Clock,
  Target,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ocrService, type OCRResult } from "@/lib/ocr/ocr-service"
import type { ProcessingProgress } from "@/lib/ocr/tesseract-service"

interface TestCase {
  id: string
  name: string
  description: string
  imageFile: File | null
  expectedData: Record<string, string>
  imageQuality: "excellent" | "good" | "fair" | "poor"
  ticketFormat: "digital" | "handwritten" | "printed" | "faded" | "skewed"
  result?: OCRResult
  accuracy?: number
  fieldAccuracies?: Record<string, number>
}

export default function OCRTestingPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [currentTest, setCurrentTest] = useState<TestCase | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [testResults, setTestResults] = useState<{
    totalTests: number
    passed: number
    failed: number
    averageAccuracy: number
    averageProcessingTime: number
  }>({
    totalTests: 0,
    passed: 0,
    failed: 0,
    averageAccuracy: 0,
    averageProcessingTime: 0,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newTestCase, setNewTestCase] = useState<Partial<TestCase>>({
    name: "",
    description: "",
    imageQuality: "good",
    ticketFormat: "printed",
    expectedData: {
      ticketNumber: "",
      date: "",
      truckRegistration: "",
      driverName: "",
      commodity: "",
      weight: "",
      loadingLocation: "",
      destination: "",
      dispatcher: "",
    },
  })

  const handleAddTestCase = () => {
    if (!newTestCase.name || !newTestCase.imageFile) {
      alert("Please provide a name and select an image file")
      return
    }

    const testCase: TestCase = {
      id: Date.now().toString(),
      name: newTestCase.name!,
      description: newTestCase.description || "",
      imageFile: newTestCase.imageFile!,
      expectedData: newTestCase.expectedData!,
      imageQuality: newTestCase.imageQuality!,
      ticketFormat: newTestCase.ticketFormat!,
    }

    setTestCases((prev) => [...prev, testCase])

    // Reset form
    setNewTestCase({
      name: "",
      description: "",
      imageQuality: "good",
      ticketFormat: "printed",
      expectedData: {
        ticketNumber: "",
        date: "",
        truckRegistration: "",
        driverName: "",
        commodity: "",
        weight: "",
        loadingLocation: "",
        destination: "",
        dispatcher: "",
      },
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewTestCase((prev) => ({ ...prev, imageFile: file }))
    }
  }

  const runSingleTest = async (testCase: TestCase): Promise<TestCase> => {
    if (!testCase.imageFile) {
      throw new Error("No image file provided")
    }

    setCurrentTest(testCase)

    const progressCallback = (progress: ProcessingProgress) => {
      setProgress(progress.progress)
    }

    try {
      const result = await ocrService.processImage(testCase.imageFile, progressCallback)

      // Calculate accuracy
      const accuracyResult = await ocrService.testOCRAccuracy(testCase.imageFile, testCase.expectedData)

      return {
        ...testCase,
        result,
        accuracy: accuracyResult.accuracy,
        fieldAccuracies: accuracyResult.fieldAccuracies,
      }
    } catch (error) {
      console.error("Test failed:", error)
      return {
        ...testCase,
        result: {
          success: false,
          text: "",
          confidence: 0,
          extractedData: {},
          engine: "tesseract",
          processingTime: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        accuracy: 0,
        fieldAccuracies: {},
      }
    }
  }

  const runAllTests = async () => {
    if (testCases.length === 0) {
      alert("No test cases available")
      return
    }

    setIsRunning(true)
    setProgress(0)

    const results: TestCase[] = []
    let totalAccuracy = 0
    let totalProcessingTime = 0
    let passedTests = 0

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`Running test ${i + 1}/${testCases.length}: ${testCase.name}`)

      try {
        const result = await runSingleTest(testCase)
        results.push(result)

        if (result.accuracy !== undefined) {
          totalAccuracy += result.accuracy
          if (result.accuracy >= 70) {
            // Consider 70% as passing
            passedTests++
          }
        }

        if (result.result?.processingTime) {
          totalProcessingTime += result.result.processingTime
        }
      } catch (error) {
        console.error(`Test ${testCase.name} failed:`, error)
        results.push({
          ...testCase,
          accuracy: 0,
          result: {
            success: false,
            text: "",
            confidence: 0,
            extractedData: {},
            engine: "tesseract",
            processingTime: 0,
            error: "Test execution failed",
          },
        })
      }

      setProgress(((i + 1) / testCases.length) * 100)
    }

    // Update test cases with results
    setTestCases(results)

    // Update summary statistics
    setTestResults({
      totalTests: results.length,
      passed: passedTests,
      failed: results.length - passedTests,
      averageAccuracy: results.length > 0 ? totalAccuracy / results.length : 0,
      averageProcessingTime: results.length > 0 ? totalProcessingTime / results.length : 0,
    })

    setIsRunning(false)
    setCurrentTest(null)
    setProgress(0)
  }

  const exportResults = () => {
    const csvContent = [
      ["Test Name", "Image Quality", "Ticket Format", "Accuracy (%)", "Processing Time (ms)", "Status", "Error"].join(
        ",",
      ),
      ...testCases.map((test) =>
        [
          test.name,
          test.imageQuality,
          test.ticketFormat,
          test.accuracy?.toFixed(2) || "0",
          test.result?.processingTime || "0",
          test.result?.success ? "Pass" : "Fail",
          test.result?.error || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ocr-test-results-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600"
    if (accuracy >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 80) return "default"
    if (accuracy >= 60) return "secondary"
    return "destructive"
  }

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OCR Testing & Validation</h1>
          <p className="text-gray-600 mt-2">Test and validate OCR accuracy with various ticket formats and qualities</p>
        </div>

        {/* Test Results Summary */}
        {testResults.totalTests > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testResults.totalTests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{testResults.passed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{testResults.failed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getAccuracyColor(testResults.averageAccuracy)}`}>
                  {testResults.averageAccuracy.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(testResults.averageProcessingTime)}ms</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Test</TabsTrigger>
            <TabsTrigger value="run">Run Tests</TabsTrigger>
            <TabsTrigger value="results">View Results</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Test Case</CardTitle>
                <CardDescription>Add a new test case with expected data for validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="testName">Test Name</Label>
                    <Input
                      id="testName"
                      placeholder="e.g., High Quality Digital Ticket"
                      value={newTestCase.name}
                      onChange={(e) => setNewTestCase((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testImage">Test Image</Label>
                    <Input
                      id="testImage"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageQuality">Image Quality</Label>
                    <Select
                      value={newTestCase.imageQuality}
                      onValueChange={(value: any) => setNewTestCase((prev) => ({ ...prev, imageQuality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticketFormat">Ticket Format</Label>
                    <Select
                      value={newTestCase.ticketFormat}
                      onValueChange={(value: any) => setNewTestCase((prev) => ({ ...prev, ticketFormat: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital">Digital/Computer Generated</SelectItem>
                        <SelectItem value="printed">Printed Form</SelectItem>
                        <SelectItem value="handwritten">Handwritten</SelectItem>
                        <SelectItem value="faded">Faded/Worn</SelectItem>
                        <SelectItem value="skewed">Skewed/Rotated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Optional description of the test case"
                      value={newTestCase.description}
                      onChange={(e) => setNewTestCase((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Expected Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(newTestCase.expectedData || {}).map(([field, value]) => (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={field}>
                          {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
                        </Label>
                        <Input
                          id={field}
                          placeholder={`Expected ${field}`}
                          value={value}
                          onChange={(e) =>
                            setNewTestCase((prev) => ({
                              ...prev,
                              expectedData: {
                                ...prev.expectedData,
                                [field]: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleAddTestCase} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Test Case
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="run" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Run OCR Tests
                </CardTitle>
                <CardDescription>Execute all test cases and measure OCR accuracy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testCases.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>No test cases available. Create some test cases first.</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {testCases.length} test case{testCases.length !== 1 ? "s" : ""} ready
                      </span>
                      <div className="flex gap-2">
                        <Button onClick={runAllTests} disabled={isRunning}>
                          {isRunning ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Running Tests...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Run All Tests
                            </>
                          )}
                        </Button>
                        {testResults.totalTests > 0 && (
                          <Button variant="outline" onClick={exportResults}>
                            <Download className="h-4 w-4 mr-2" />
                            Export Results
                          </Button>
                        )}
                      </div>
                    </div>

                    {isRunning && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                        {currentTest && <p className="text-sm text-gray-600">Currently testing: {currentTest.name}</p>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="font-medium">Test Cases</h4>
                      {testCases.map((testCase) => (
                        <div key={testCase.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{testCase.name}</span>
                              <Badge variant="outline">{testCase.imageQuality}</Badge>
                              <Badge variant="outline">{testCase.ticketFormat}</Badge>
                              {testCase.accuracy !== undefined && (
                                <Badge variant={getAccuracyBadge(testCase.accuracy)}>
                                  {testCase.accuracy.toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                            {testCase.description && (
                              <p className="text-sm text-gray-600 mt-1">{testCase.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {testCase.result?.success === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {testCase.result?.success === false && <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {testCases
              .filter((tc) => tc.result)
              .map((testCase) => (
                <Card key={testCase.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{testCase.name}</span>
                      <div className="flex items-center gap-2">
                        {testCase.accuracy !== undefined && (
                          <Badge variant={getAccuracyBadge(testCase.accuracy)}>
                            {testCase.accuracy.toFixed(1)}% Accuracy
                          </Badge>
                        )}
                        {testCase.result?.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {testCase.result?.error && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{testCase.result.error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Processing Time:</span>
                        <span className="ml-2 font-medium">{testCase.result?.processingTime}ms</span>
                      </div>
                      <div>
                        <span className="text-gray-500">OCR Confidence:</span>
                        <span className="ml-2 font-medium">{testCase.result?.confidence.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Image Quality:</span>
                        <span className="ml-2 font-medium capitalize">{testCase.result?.imageQuality}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Preprocessing:</span>
                        <span className="ml-2 font-medium">
                          {testCase.result?.preprocessingApplied ? "Applied" : "None"}
                        </span>
                      </div>
                    </div>

                    {testCase.fieldAccuracies && (
                      <div>
                        <h4 className="font-medium mb-2">Field Accuracies</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(testCase.fieldAccuracies).map(([field, accuracy]) => (
                            <div key={field} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm capitalize">{field.replace(/([A-Z])/g, " $1")}</span>
                              <Badge variant={getAccuracyBadge(accuracy)}>{accuracy.toFixed(1)}%</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {testCase.result?.text && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4" />
                          Extracted Text
                        </Label>
                        <div className="p-3 bg-gray-50 rounded border text-sm font-mono max-h-32 overflow-y-auto">
                          {testCase.result.text}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
