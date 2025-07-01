import tesseractService, {
  type TesseractResult,
  type TesseractConfig,
  type ProcessingProgress,
} from "./tesseract-service"

export interface OCRConfig {
  engine: "tesseract" | "google-vision" | "azure-vision"
  language: string
  psm: number
  oem: number
  dpi?: number
  whitelist?: string
  blacklist?: string
  preserveInterwordSpaces?: boolean
  preprocessing?: {
    contrast?: number
    brightness?: number
    blur?: number
    sharpen?: boolean
    grayscale?: boolean
    threshold?: number
  }
}

export interface ExtractedField {
  value: string
  confidence: number
  bbox?: { x0: number; y0: number; x1: number; y1: number }
  source: "ocr" | "pattern" | "manual"
}

export interface OCRResult {
  success: boolean
  text: string
  confidence: number
  extractedData: Record<string, ExtractedField>
  engine: string
  processingTime: number
  imageQuality?: "excellent" | "good" | "fair" | "poor"
  preprocessingApplied?: boolean
  error?: string
  rawResult?: TesseractResult
}

export interface TicketField {
  name: string
  patterns: RegExp[]
  validator?: (value: string) => boolean
  transformer?: (value: string) => string
}

class OCRService {
  private config: OCRConfig = {
    engine: "tesseract",
    language: "eng",
    psm: 6,
    oem: 3,
    dpi: 300,
    preserveInterwordSpaces: true,
    preprocessing: {
      grayscale: true,
      contrast: 1.1,
    },
  }

  private ticketFields: TicketField[] = [
    {
      name: "ticketNumber",
      patterns: [
        /(?:slip|ticket|ref|no|number)[\s\w]*:?\s*([A-Z0-9-]{3,20})/i,
        /\b(T[KT]?[-\s]?\d{4,8})\b/i,
        /\b([A-Z]{2,3}[-\s]?\d{4,8})\b/i,
        /\b(\d{4})\b/i, // 4-digit slip numbers
      ],
      validator: (value) => /^[A-Z0-9-]{3,20}$/i.test(value),
      transformer: (value) => value.toUpperCase().trim(),
    },
    {
      name: "date",
      patterns: [
        /(?:date|issued?)[\s\w]*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        /(?:date|issued?)[\s\w]*:?\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2})/i,
        /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
        /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/,
      ],
      validator: (value) => !isNaN(Date.parse(value)),
      transformer: (value) => {
        // Normalize date format to DD/MM/YY
        const date = new Date(value)
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear().toString().slice(-2)
        return `${day}/${month}/${year}`
      },
    },
    {
      name: "truckRegistration",
      patterns: [
        /(?:truck|vehicle|reg|registration)[\s\w]*:?\s*([A-Z]{2,3}[-\s]?\d{3,4})/i,
        /\b([A-Z]{2,3}[-\s]?\d{3,4})\b/,
        /(?:plate|license)[\s\w]*:?\s*([A-Z0-9-]{3,10})/i,
      ],
      validator: (value) => /^[A-Z0-9-]{3,10}$/i.test(value),
      transformer: (value) => value.toUpperCase().replace(/[-\s]/g, '').trim(),
    },
    {
      name: "driverName",
      patterns: [
        /(?:driver|operator)[\s\w]*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /(?:name)[\s\w]*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      ],
      validator: (value) => /^[A-Za-z\s]{2,50}$/.test(value),
      transformer: (value) => value.trim().replace(/\s+/g, " "),
    },
    {
      name: "commodity",
      patterns: [
        /(?:commodity|material|product)[\s\w]*:?\s*(bauxite|alumina|coal|limestone)/i,
        /\b(bauxite|alumina|coal|limestone)\b/i,
      ],
      validator: (value) => ["bauxite", "alumina", "coal", "limestone"].includes(value.toLowerCase()),
      transformer: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
    },
    {
      name: "weight",
      patterns: [
        /(?:weight|net weight|gross|tonnage|tons?)[\s\w]*:?\s*(\d+\.?\d*)\s*(?:tons?|t|kg)?/i,
        /(\d+\.?\d*)\s*(?:tons?|t)\b/i,
        /(?:weight)[\s\w]*:?\s*(\d+\.?\d*)/i,
      ],
      validator: (value) => {
        const num = parseFloat(value)
        return !isNaN(num) && num >= 10.00 && num <= 40.00
      },
      transformer: (value) => parseFloat(value).toFixed(2),
    },
    {
      name: "loadingLocation",
      patterns: [
        /(?:from|origin|loading|pickup)[\s\w]*:?\s*([A-Z][a-zA-Z\s]{2,50})/i,
        /(?:mine|site|plant)[\s\w]*:?\s*([A-Z][a-zA-Z\s\d]{2,50})/i,
        /(?:st\.?\s+jago|jago)\s*(mine)?/i,
      ],
      validator: (value) => value.length >= 3 && value.length <= 50,
      transformer: (value) => value.trim(),
    },
    {
      name: "destination",
      patterns: [
        /(?:to|destination|delivery|drop)[\s\w]*:?\s*([A-Z][a-zA-Z\s]{2,50})/i,
        /(?:port|terminal|plant)[\s\w]*:?\s*([A-Z][a-zA-Z\s\d]{2,50})/i,
        /\b(jamalco|port\s+esquivel|kingston\s+port)\b/i,
      ],
      validator: (value) => value.length >= 3 && value.length <= 50,
      transformer: (value) => value.trim(),
    },
    {
      name: "dispatcher",
      patterns: [
        /(?:dispatcher|coordinator|supervisor)[\s\w]*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /(?:authorized by|approved by|signature)[\s\w]*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /(?:a\.?\s*bailey|bailey)/i,
      ],
      validator: (value) => /^[A-Za-z\s\.]{2,30}$/.test(value),
      transformer: (value) => value.trim().replace(/\s+/g, " "),
    },
  ]

  async processImage(imageFile: File, onProgress?: (progress: ProcessingProgress) => void): Promise<OCRResult> {
    const startTime = Date.now()

    try {
      console.log("Starting OCR processing with Tesseract.js...")

      // Analyze image quality first
      const qualityAnalysis = await tesseractService.analyzeImageQuality(imageFile)
      console.log("Image quality analysis:", qualityAnalysis)

      let processedImageFile = imageFile
      let preprocessingApplied = false

      // Apply preprocessing if needed
      if (qualityAnalysis.needsPreprocessing && this.config.preprocessing) {
        console.log("Applying image preprocessing...")
        try {
          const preprocessedDataUrl = await tesseractService.preprocessImage(imageFile, {
            ...this.config.preprocessing,
            ...qualityAnalysis.suggestedSettings,
          })

          // Convert data URL back to File
          const response = await fetch(preprocessedDataUrl)
          const blob = await response.blob()
          processedImageFile = new File([blob], imageFile.name, { type: "image/png" })
          preprocessingApplied = true

          console.log("Image preprocessing completed")
        } catch (preprocessError) {
          console.warn("Preprocessing failed, using original image:", preprocessError)
        }
      }

      // Configure Tesseract
      const tesseractConfig: TesseractConfig = {
        language: this.config.language,
        psm: this.config.psm,
        oem: this.config.oem,
        dpi: this.config.dpi,
        whitelist: this.config.whitelist,
        blacklist: this.config.blacklist,
        preserveInterwordSpaces: this.config.preserveInterwordSpaces,
      }

      // Process with Tesseract
      const tesseractResult = await tesseractService.processImage(processedImageFile, tesseractConfig, onProgress)

      console.log("Tesseract OCR completed, extracting fields...")

      // Extract structured data from OCR text
      const extractedData = this.extractTicketFields(tesseractResult)

      const processingTime = Date.now() - startTime

      const result: OCRResult = {
        success: true,
        text: tesseractResult.text,
        confidence: tesseractResult.confidence,
        extractedData,
        engine: "tesseract",
        processingTime,
        imageQuality: qualityAnalysis.quality,
        preprocessingApplied,
        rawResult: tesseractResult,
      }

      console.log("OCR processing completed successfully:", {
        processingTime,
        confidence: tesseractResult.confidence,
        fieldsExtracted: Object.keys(extractedData).length,
      })

      return result
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error("OCR processing failed:", error)

      return {
        success: false,
        text: "",
        confidence: 0,
        extractedData: {},
        engine: "tesseract",
        processingTime,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  private extractTicketFields(tesseractResult: TesseractResult): Record<string, ExtractedField> {
    const extractedData: Record<string, ExtractedField> = {}
    const text = tesseractResult.text
    const lines = tesseractResult.lines

    console.log("Extracting fields from OCR text...")

    for (const field of this.ticketFields) {
      let bestMatch: ExtractedField | null = null
      let bestConfidence = 0

      // Try each pattern for this field
      for (const pattern of field.patterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          let value = match[1].trim()

          // Apply transformer if available
          if (field.transformer) {
            try {
              value = field.transformer(value)
            } catch (transformError) {
              console.warn(`Transform failed for field ${field.name}:`, transformError)
            }
          }

          // Validate the extracted value
          if (!field.validator || field.validator(value)) {
            // Find the confidence for this text segment
            const confidence = this.findTextConfidence(value, lines)

            if (confidence > bestConfidence) {
              bestMatch = {
                value,
                confidence,
                source: "pattern",
              }
              bestConfidence = confidence
            }
          }
        }
      }

      if (bestMatch) {
        extractedData[field.name] = bestMatch
        console.log(`Extracted ${field.name}:`, bestMatch.value, `(${bestMatch.confidence.toFixed(1)}%)`)
      } else {
        console.log(`No match found for field: ${field.name}`)
      }
    }

    return extractedData
  }

  private findTextConfidence(searchText: string, lines: TesseractResult["lines"]): number {
    let maxConfidence = 0

    for (const line of lines) {
      if (line.text.toLowerCase().includes(searchText.toLowerCase())) {
        maxConfidence = Math.max(maxConfidence, line.confidence)
      }

      // Also check individual words
      for (const word of line.words) {
        if (
          word.text.toLowerCase().includes(searchText.toLowerCase()) ||
          searchText.toLowerCase().includes(word.text.toLowerCase())
        ) {
          maxConfidence = Math.max(maxConfidence, word.confidence)
        }
      }
    }

    return maxConfidence || 50 // Default confidence if not found
  }

  async processMultipleImages(
    imageFiles: File[],
    onProgress?: (imageIndex: number, progress: ProcessingProgress) => void,
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = []

    for (let i = 0; i < imageFiles.length; i++) {
      console.log(`Processing image ${i + 1} of ${imageFiles.length}`)

      const progressCallback = onProgress ? (progress: ProcessingProgress) => onProgress(i, progress) : undefined

      try {
        const result = await this.processImage(imageFiles[i], progressCallback)
        results.push(result)
      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error)
        results.push({
          success: false,
          text: "",
          confidence: 0,
          extractedData: {},
          engine: "tesseract",
          processingTime: 0,
          error: error instanceof Error ? error.message : "Processing failed",
        })
      }
    }

    return results
  }

  updateConfig(newConfig: Partial<OCRConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log("OCR configuration updated:", newConfig)
  }

  getConfig(): OCRConfig {
    return { ...this.config }
  }

  async initialize(): Promise<void> {
    try {
      await tesseractService.initialize({
        language: this.config.language,
        psm: this.config.psm,
        oem: this.config.oem,
        dpi: this.config.dpi,
        whitelist: this.config.whitelist,
        blacklist: this.config.blacklist,
        preserveInterwordSpaces: this.config.preserveInterwordSpaces,
      })
      console.log("OCR service initialized successfully")
    } catch (error) {
      console.error("Failed to initialize OCR service:", error)
      throw error
    }
  }

  async terminate(): Promise<void> {
    await tesseractService.terminate()
    console.log("OCR service terminated")
  }

  // Utility methods
  async testOCRAccuracy(
    testImage: File,
    expectedData: Record<string, string>,
  ): Promise<{
    accuracy: number
    fieldAccuracies: Record<string, number>
    processingTime: number
  }> {
    const result = await this.processImage(testImage)

    if (!result.success) {
      return {
        accuracy: 0,
        fieldAccuracies: {},
        processingTime: result.processingTime,
      }
    }

    const fieldAccuracies: Record<string, number> = {}
    let totalAccuracy = 0
    let fieldCount = 0

    for (const [fieldName, expectedValue] of Object.entries(expectedData)) {
      const extractedField = result.extractedData[fieldName]

      if (extractedField) {
        const similarity = this.calculateStringSimilarity(
          extractedField.value.toLowerCase(),
          expectedValue.toLowerCase(),
        )
        fieldAccuracies[fieldName] = similarity * 100
        totalAccuracy += similarity
      } else {
        fieldAccuracies[fieldName] = 0
      }

      fieldCount++
    }

    return {
      accuracy: fieldCount > 0 ? (totalAccuracy / fieldCount) * 100 : 0,
      fieldAccuracies,
      processingTime: result.processingTime,
    }
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance algorithm
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
      }
    }

    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength
  }

  // Get detailed OCR statistics
  getProcessingStats(): {
    isInitialized: boolean
    workerStatus: Array<{ id: number; busy: boolean }>
    config: OCRConfig
  } {
    return {
      isInitialized: tesseractService["isInitialized"],
      workerStatus: tesseractService.getWorkerStatus(),
      config: this.config,
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService()
export default ocrService