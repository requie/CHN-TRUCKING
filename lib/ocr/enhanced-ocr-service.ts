// Enhanced OCR service with ML integration
import { ocrService, type OCRResult, type OCRConfig } from './ocr-service'
import { mlFieldDetector, type MLFieldDetection } from '../ml/field-detector'

export interface EnhancedOCRResult extends OCRResult {
  mlDetections: MLFieldDetection[]
  hybridConfidence: number
  fieldValidations: Record<string, {
    ocrValue: string
    mlValue: string
    finalValue: string
    confidence: number
    source: 'ocr' | 'ml' | 'hybrid'
  }>
}

class EnhancedOCRService {
  private config: OCRConfig

  constructor() {
    this.config = ocrService.getConfig()
  }

  async processImageWithML(
    imageFile: File,
    onProgress?: (progress: { status: string; progress: number }) => void
  ): Promise<EnhancedOCRResult> {
    // Step 1: Traditional OCR processing
    onProgress?.({ status: 'Running OCR analysis...', progress: 20 })
    const ocrResult = await ocrService.processImage(imageFile, onProgress)

    if (!ocrResult.success) {
      return {
        ...ocrResult,
        mlDetections: [],
        hybridConfidence: 0,
        fieldValidations: {}
      }
    }

    // Step 2: ML-based field detection
    onProgress?.({ status: 'Applying ML field detection...', progress: 60 })
    const imageDataUrl = await this.fileToDataUrl(imageFile)
    const mlDetections = await mlFieldDetector.detectFields(imageDataUrl, ocrResult.text)

    // Step 3: Hybrid analysis - combine OCR and ML results
    onProgress?.({ status: 'Combining results...', progress: 80 })
    const fieldValidations = this.combineResults(ocrResult, mlDetections)

    // Step 4: Calculate hybrid confidence
    const hybridConfidence = this.calculateHybridConfidence(ocrResult, mlDetections, fieldValidations)

    onProgress?.({ status: 'Processing complete', progress: 100 })

    return {
      ...ocrResult,
      mlDetections,
      hybridConfidence,
      fieldValidations,
      extractedData: this.buildEnhancedExtractedData(fieldValidations)
    }
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private combineResults(
    ocrResult: OCRResult,
    mlDetections: MLFieldDetection[]
  ): Record<string, {
    ocrValue: string
    mlValue: string
    finalValue: string
    confidence: number
    source: 'ocr' | 'ml' | 'hybrid'
  }> {
    const fieldValidations: Record<string, any> = {}

    // Get all unique field names from both sources
    const allFields = new Set([
      ...Object.keys(ocrResult.extractedData),
      ...mlDetections.map(d => d.fieldName)
    ])

    for (const fieldName of allFields) {
      const ocrField = ocrResult.extractedData[fieldName]
      const mlField = mlDetections.find(d => d.fieldName === fieldName)

      const ocrValue = ocrField?.value || ''
      const mlValue = mlField?.value || ''
      const ocrConfidence = ocrField?.confidence || 0
      const mlConfidence = mlField?.confidence || 0

      // Determine the best value using hybrid logic
      const validation = this.selectBestValue(
        ocrValue,
        mlValue,
        ocrConfidence,
        mlConfidence,
        fieldName
      )

      fieldValidations[fieldName] = {
        ocrValue,
        mlValue,
        ...validation
      }
    }

    return fieldValidations
  }

  private selectBestValue(
    ocrValue: string,
    mlValue: string,
    ocrConfidence: number,
    mlConfidence: number,
    fieldName: string
  ): {
    finalValue: string
    confidence: number
    source: 'ocr' | 'ml' | 'hybrid'
  } {
    // If values are similar, use the one with higher confidence
    if (this.areValuesSimilar(ocrValue, mlValue)) {
      if (ocrConfidence >= mlConfidence) {
        return {
          finalValue: ocrValue,
          confidence: Math.max(ocrConfidence, mlConfidence) + 10, // Boost for agreement
          source: 'hybrid'
        }
      } else {
        return {
          finalValue: mlValue,
          confidence: Math.max(ocrConfidence, mlConfidence) + 10,
          source: 'hybrid'
        }
      }
    }

    // If values differ significantly, use field-specific logic
    const fieldPreference = this.getFieldPreference(fieldName)
    
    if (fieldPreference === 'ml' && mlValue && mlConfidence > 50) {
      return {
        finalValue: mlValue,
        confidence: mlConfidence,
        source: 'ml'
      }
    }

    if (fieldPreference === 'ocr' && ocrValue && ocrConfidence > 50) {
      return {
        finalValue: ocrValue,
        confidence: ocrConfidence,
        source: 'ocr'
      }
    }

    // Default: use the value with higher confidence
    if (ocrConfidence >= mlConfidence && ocrValue) {
      return {
        finalValue: ocrValue,
        confidence: ocrConfidence,
        source: 'ocr'
      }
    } else if (mlValue) {
      return {
        finalValue: mlValue,
        confidence: mlConfidence,
        source: 'ml'
      }
    }

    // Fallback
    return {
      finalValue: ocrValue || mlValue || '',
      confidence: Math.max(ocrConfidence, mlConfidence),
      source: 'hybrid'
    }
  }

  private areValuesSimilar(value1: string, value2: string): boolean {
    if (!value1 || !value2) return false
    
    const normalized1 = value1.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalized2 = value2.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Calculate similarity ratio
    const similarity = this.calculateSimilarity(normalized1, normalized2)
    return similarity > 0.8 // 80% similarity threshold
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private getFieldPreference(fieldName: string): 'ocr' | 'ml' | 'balanced' {
    // Field-specific preferences based on typical accuracy
    const preferences: Record<string, 'ocr' | 'ml' | 'balanced'> = {
      ticketNumber: 'ocr', // OCR usually better for alphanumeric codes
      date: 'ml', // ML better at date format recognition
      weight: 'ocr', // OCR better for numbers
      truckRegistration: 'ocr', // OCR better for license plates
      driverName: 'ml', // ML better at name recognition
      commodity: 'ml', // ML better at categorization
      loadingLocation: 'ml', // ML better at location recognition
      destination: 'ml', // ML better at location recognition
      dispatcher: 'ml' // ML better at name recognition
    }

    return preferences[fieldName] || 'balanced'
  }

  private calculateHybridConfidence(
    ocrResult: OCRResult,
    mlDetections: MLFieldDetection[],
    fieldValidations: Record<string, any>
  ): number {
    const validations = Object.values(fieldValidations)
    if (validations.length === 0) return 0

    // Calculate weighted average confidence
    let totalConfidence = 0
    let totalWeight = 0

    for (const validation of validations) {
      const weight = validation.source === 'hybrid' ? 1.5 : 1.0 // Boost hybrid results
      totalConfidence += validation.confidence * weight
      totalWeight += weight
    }

    const avgConfidence = totalConfidence / totalWeight

    // Boost confidence if multiple fields were detected
    const detectedFieldsCount = validations.filter(v => v.finalValue).length
    const fieldBonus = Math.min(detectedFieldsCount * 2, 10) // Max 10% bonus

    return Math.min(100, avgConfidence + fieldBonus)
  }

  private buildEnhancedExtractedData(fieldValidations: Record<string, any>) {
    const extractedData: Record<string, any> = {}

    for (const [fieldName, validation] of Object.entries(fieldValidations)) {
      if (validation.finalValue) {
        extractedData[fieldName] = {
          value: validation.finalValue,
          confidence: validation.confidence,
          source: validation.source,
          bbox: undefined // Could be enhanced with bounding box info
        }
      }
    }

    return extractedData
  }

  // Training and improvement methods
  async improveFromUserFeedback(
    imageFile: File,
    userCorrections: Record<string, string>
  ): Promise<void> {
    // Process the image to get current results
    const result = await this.processImageWithML(imageFile)

    // Send corrections to ML model for learning
    for (const [fieldName, correctValue] of Object.entries(userCorrections)) {
      const validation = result.fieldValidations[fieldName]
      if (validation) {
        await mlFieldDetector.improveModel(fieldName, correctValue, validation.finalValue)
      }
    }

    console.log('User feedback processed for model improvement')
  }

  // Batch processing with ML enhancement
  async processBatchWithML(
    files: File[],
    onProgress?: (fileIndex: number, progress: { status: string; progress: number }) => void
  ): Promise<EnhancedOCRResult[]> {
    const results: EnhancedOCRResult[] = []

    for (let i = 0; i < files.length; i++) {
      const progressCallback = onProgress 
        ? (progress: { status: string; progress: number }) => onProgress(i, progress)
        : undefined

      try {
        const result = await this.processImageWithML(files[i], progressCallback)
        results.push(result)
      } catch (error) {
        console.error(`Failed to process file ${i}:`, error)
        // Add error result
        results.push({
          success: false,
          text: '',
          confidence: 0,
          extractedData: {},
          engine: 'enhanced',
          processingTime: 0,
          error: error instanceof Error ? error.message : 'Processing failed',
          mlDetections: [],
          hybridConfidence: 0,
          fieldValidations: {}
        })
      }
    }

    return results
  }

  // Configuration methods
  updateConfig(newConfig: Partial<OCRConfig>): void {
    ocrService.updateConfig(newConfig)
    this.config = ocrService.getConfig()
  }

  getConfig(): OCRConfig {
    return this.config
  }

  // Utility methods
  async initialize(): Promise<void> {
    await Promise.all([
      ocrService.initialize(),
      mlFieldDetector.initialize()
    ])
  }

  async terminate(): Promise<void> {
    await ocrService.terminate()
  }
}

export const enhancedOCRService = new EnhancedOCRService()
export default enhancedOCRService