import { CHNLogo } from "./chn-logo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BrandGuide() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CHN Trucking Portal</h1>
        <p className="text-xl text-gray-600">Brand Guidelines & Design System</p>
      </div>

      {/* Logo Variations */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Variations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <CHNLogo size="lg" />
              <p className="mt-4 text-sm text-gray-600">Primary Logo - Large</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <CHNLogo size="md" />
              <p className="mt-4 text-sm text-gray-600">Standard Logo - Medium</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <CHNLogo size="sm" />
              <p className="mt-4 text-sm text-gray-600">Compact Logo - Small</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-full h-20 bg-blue-600 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Primary Blue</p>
              <p className="text-xs text-gray-500">#2563eb</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-orange-500 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Accent Orange</p>
              <p className="text-xs text-gray-500">#f97316</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-gray-900 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Text Dark</p>
              <p className="text-xs text-gray-500">#111827</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-gray-500 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Text Medium</p>
              <p className="text-xs text-gray-500">#6b7280</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Heading 1 - Bold</h1>
            <p className="text-sm text-gray-500">Used for main page titles</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Heading 2 - Semibold</h2>
            <p className="text-sm text-gray-500">Used for section headers</p>
          </div>
          <div>
            <p className="text-base text-gray-700">Body Text - Regular</p>
            <p className="text-sm text-gray-500">Used for general content</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Small Text - Regular</p>
            <p className="text-xs text-gray-500">Used for captions and metadata</p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Logo Usage</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Always maintain clear space around the logo</li>
              <li>• Use the appropriate size for the context</li>
              <li>• Ensure sufficient contrast with background</li>
              <li>• Never distort or modify the logo proportions</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Color Application</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Primary blue for main actions and branding</li>
              <li>• Orange for accents and highlights</li>
              <li>• Maintain accessibility standards (WCAG AA)</li>
              <li>• Use neutral grays for text hierarchy</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
