// Machine Learning-based field detection service
export interface MLFieldDetection {
  fieldName: string
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  value: string
  context: string[]
}

export interface MLModel {
  name: string
  version: string
  accuracy: number
  supportedFields: string[]
}

export interface TrainingData {
  imageData: string
  annotations: Array<{
    fieldName: string
    value: string
    boundingBox: { x: number; y: number; width: number; height: number }
  }>
}

class MLFieldDetector {
  private models: Map<string, MLModel> = new Map()
  private trainingData: TrainingData[] = []
  private isInitialized = false

  // Simulated ML models for different ticket types
  private ticketModels = {
    bauxite: {
      name: "Bauxite Ticket Detector",
      version: "1.2.0",
      accuracy: 0.94,
      supportedFields: ["ticketNumber", "date", "weight", "truckRegistration", "driverName"],
      patterns: {
        ticketNumber: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 },
        date: { x: 0.6, y: 0.1, width: 0.25, height: 0.05 },
        weight: { x: 0.4, y: 0.4, width: 0.2, height: 0.06 },
        truckRegistration: { x: 0.1, y: 0.25, width: 0.25, height: 0.05 },
        driverName: { x: 0.1, y: 0.35, width: 0.4, height: 0.05 },
      }
    },
    alumina: {
      name: "Alumina Ticket Detector",
      version: "1.1.0",
      accuracy: 0.91,
      supportedFields: ["ticketNumber", "date", "weight", "truckRegistration", "commodity"],
      patterns: {
        ticketNumber: { x: 0.15, y: 0.08, width: 0.3, height: 0.05 },
        date: { x: 0.55, y: 0.08, width: 0.25, height: 0.05 },
        weight: { x: 0.35, y: 0.45, width: 0.25, height: 0.06 },
        truckRegistration: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
        commodity: { x: 0.1, y: 0.55, width: 0.4, height: 0.05 },
      }
    },
    generic: {
      name: "Generic Ticket Detector",
      version: "2.0.0",
      accuracy: 0.87,
      supportedFields: ["ticketNumber", "date", "weight", "truckRegistration", "driverName", "commodity"],
      patterns: {
        ticketNumber: { x: 0.1, y: 0.1, width: 0.35, height: 0.05 },
        date: { x: 0.55, y: 0.1, width: 0.3, height: 0.05 },
        weight: { x: 0.4, y: 0.4, width: 0.25, height: 0.06 },
        truckRegistration: { x: 0.1, y: 0.25, width: 0.3, height: 0.05 },
        driverName: { x: 0.1, y: 0.35, width: 0.45, height: 0.05 },
        commodity: { x: 0.1, y: 0.55, width: 0.4, height: 0.05 },
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log("Initializing ML Field Detector...")

    // Load pre-trained models
    for (const [type, model] of Object.entries(this.ticketModels)) {
      this.models.set(type, model as MLModel)
    }

    this.isInitialized = true
    console.log("ML Field Detector initialized with", this.models.size, "models")
  }

  async detectFields(
    imageData: string | HTMLCanvasElement,
    ocrText: string,
    ticketType?: string
  ): Promise<MLFieldDetection[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const detectedType = ticketType || await this.classifyTicketType(ocrText)
    const model = this.models.get(detectedType) || this.models.get('generic')!

    console.log(`Using ${model.name} for field detection`)

    return this.performFieldDetection(imageData, ocrText, model)
  }

  private async classifyTicketType(ocrText: string): Promise<string> {
    const text = ocrText.toLowerCase()
    
    // Simple classification based on keywords
    if (text.includes('bauxite') || text.includes('mine')) {
      return 'bauxite'
    } else if (text.includes('alumina') || text.includes('refinery')) {
      return 'alumina'
    }
    
    return 'generic'
  }

  private async performFieldDetection(
    imageData: string | HTMLCanvasElement,
    ocrText: string,
    model: MLModel
  ): Promise<MLFieldDetection[]> {
    const detections: MLFieldDetection[] = []
    
    // Get image dimensions
    const { width, height } = await this.getImageDimensions(imageData)
    
    // Simulate ML-based field detection with improved accuracy
    for (const [fieldName, pattern] of Object.entries((model as any).patterns)) {
      const detection = await this.detectField(
        fieldName,
        pattern,
        ocrText,
        width,
        height,
        model.accuracy
      )
      
      if (detection) {
        detections.push(detection)
      }
    }

    return detections.sort((a, b) => b.confidence - a.confidence)
  }

  private async detectField(
    fieldName: string,
    pattern: any,
    ocrText: string,
    imageWidth: number,
    imageHeight: number,
    baseAccuracy: number
  ): Promise<MLFieldDetection | null> {
    // Extract potential values using enhanced pattern matching
    const value = this.extractFieldValue(fieldName, ocrText)
    
    if (!value) return null

    // Calculate bounding box based on pattern
    const boundingBox = {
      x: Math.round(pattern.x * imageWidth),
      y: Math.round(pattern.y * imageHeight),
      width: Math.round(pattern.width * imageWidth),
      height: Math.round(pattern.height * imageHeight)
    }

    // Calculate confidence based on multiple factors
    const confidence = this.calculateConfidence(fieldName, value, ocrText, baseAccuracy)

    // Extract context (surrounding text)
    const context = this.extractContext(value, ocrText)

    return {
      fieldName,
      boundingBox,
      confidence,
      value,
      context
    }
  }

  private extractFieldValue(fieldName: string, ocrText: string): string | null {
    const patterns: Record<string, RegExp[]> = {
      ticketNumber: [
        /(?:ticket|ref|no|number)[\s\w]*:?\s*([A-Z0-9-]{3,20})/i,
        /\b(T[KT]?[-\s]?\d{4,8})\b/i,
        /\b([A-Z]{2,3}[-\s]?\d{4,8})\b/i,
      ],
      date: [
        /(?:date|issued?)[\s\w]*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
        /(?:date|issued?)[\s\w]*:?\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2})/i,
        /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/,
      ],
      weight: [
        /(?:weight|net weight|gross)[\s\w]*:?\s*(\d+\.?\d*)\s*(?:tons?|t|kg)/i,
        /(\d+\.?\d*)\s*(?:tons?|t)\b/i,
      ],
      truckRegistration: [
        /(?:truck|vehicle|reg|registration)[\s\w]*:?\s*([A-Z]{2,3}[-\s]?\d{3,4})/i,
        /\b([A-Z]{2,3}[-\s]?\d{3,4})\b/,
      ],
      driverName: [
        /(?:driver|operator)[\s\w]*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      ],
      commodity: [
        /(?:commodity|material|product)[\s\w]*:?\s*(bauxite|alumina|coal|limestone)/i,
        /\b(bauxite|alumina|coal|limestone)\b/i,
      ]
    }

    const fieldPatterns = patterns[fieldName] || []
    
    for (const pattern of fieldPatterns) {
      const match = ocrText.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  private calculateConfidence(
    fieldName: string,
    value: string,
    ocrText: string,
    baseAccuracy: number
  ): number {
    let confidence = baseAccuracy * 100

    // Boost confidence based on field-specific validation
    if (this.validateField(fieldName, value)) {
      confidence += 10
    }

    // Boost confidence if field label is found nearby
    const hasLabel = this.hasFieldLabel(fieldName, value, ocrText)
    if (hasLabel) {
      confidence += 15
    }

    // Reduce confidence for ambiguous values
    if (this.isAmbiguous(value)) {
      confidence -= 20
    }

    return Math.max(0, Math.min(100, confidence))
  }

  private validateField(fieldName: string, value: string): boolean {
    const validators: Record<string, (val: string) => boolean> = {
      ticketNumber: (val) => /^[A-Z0-9-]{3,20}$/i.test(val),
      date: (val) => !isNaN(Date.parse(val)),
      weight: (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      truckRegistration: (val) => /^[A-Z0-9-]{3,10}$/i.test(val),
      driverName: (val) => /^[A-Za-z\s]{2,50}$/.test(val),
      commodity: (val) => ['bauxite', 'alumina', 'coal', 'limestone'].includes(val.toLowerCase())
    }

    const validator = validators[fieldName]
    return validator ? validator(value) : true
  }

  private hasFieldLabel(fieldName: string, value: string, ocrText: string): boolean {
    const labels: Record<string, string[]> = {
      ticketNumber: ['ticket', 'ref', 'number', 'no'],
      date: ['date', 'issued'],
      weight: ['weight', 'net', 'gross', 'tons'],
      truckRegistration: ['truck', 'vehicle', 'reg', 'registration'],
      driverName: ['driver', 'operator', 'name'],
      commodity: ['commodity', 'material', 'product']
    }

    const fieldLabels = labels[fieldName] || []
    const valueIndex = ocrText.toLowerCase().indexOf(value.toLowerCase())
    
    if (valueIndex === -1) return false

    const contextBefore = ocrText.substring(Math.max(0, valueIndex - 50), valueIndex).toLowerCase()
    
    return fieldLabels.some(label => contextBefore.includes(label))
  }

  private isAmbiguous(value: string): boolean {
    // Check if value could match multiple field types
    const ambiguousPatterns = [
      /^\d{1,2}$/, // Single/double digit numbers
      /^[A-Z]$/, // Single letters
      /^\d{4}$/, // Could be year or number
    ]

    return ambiguousPatterns.some(pattern => pattern.test(value))
  }

  private extractContext(value: string, ocrText: string): string[] {
    const valueIndex = ocrText.indexOf(value)
    if (valueIndex === -1) return []

    const contextBefore = ocrText.substring(Math.max(0, valueIndex - 30), valueIndex)
    const contextAfter = ocrText.substring(valueIndex + value.length, valueIndex + value.length + 30)

    return [
      contextBefore.trim(),
      contextAfter.trim()
    ].filter(Boolean)
  }

  private async getImageDimensions(imageData: string | HTMLCanvasElement): Promise<{ width: number; height: number }> {
    if (imageData instanceof HTMLCanvasElement) {
      return { width: imageData.width, height: imageData.height }
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.src = imageData
    })
  }

  // Training and improvement methods
  async addTrainingData(data: TrainingData): Promise<void> {
    this.trainingData.push(data)
    console.log(`Added training data. Total samples: ${this.trainingData.length}`)
  }

  async improveModel(fieldName: string, correctValue: string, detectedValue: string): Promise<void> {
    // Simulate model improvement based on user corrections
    console.log(`Improving model for field ${fieldName}: ${detectedValue} -> ${correctValue}`)
    
    // In a real implementation, this would update the model weights
    // For now, we'll just log the correction for future training
  }

  getModelInfo(): MLModel[] {
    return Array.from(this.models.values())
  }

  async benchmarkModel(testData: TrainingData[]): Promise<{
    accuracy: number
    fieldAccuracies: Record<string, number>
    processingTime: number
  }> {
    const startTime = Date.now()
    let totalCorrect = 0
    let totalFields = 0
    const fieldStats: Record<string, { correct: number; total: number }> = {}

    for (const data of testData) {
      const detections = await this.detectFields(data.imageData, "")
      
      for (const annotation of data.annotations) {
        const detection = detections.find(d => d.fieldName === annotation.fieldName)
        const isCorrect = detection?.value === annotation.value
        
        if (isCorrect) totalCorrect++
        totalFields++

        if (!fieldStats[annotation.fieldName]) {
          fieldStats[annotation.fieldName] = { correct: 0, total: 0 }
        }
        
        fieldStats[annotation.fieldName].total++
        if (isCorrect) {
          fieldStats[annotation.fieldName].correct++
        }
      }
    }

    const fieldAccuracies: Record<string, number> = {}
    for (const [field, stats] of Object.entries(fieldStats)) {
      fieldAccuracies[field] = (stats.correct / stats.total) * 100
    }

    return {
      accuracy: (totalCorrect / totalFields) * 100,
      fieldAccuracies,
      processingTime: Date.now() - startTime
    }
  }
}

export const mlFieldDetector = new MLFieldDetector()
export default mlFieldDetector