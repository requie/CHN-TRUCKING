import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Upload, BarChart3, Shield, Users, FileText } from "lucide-react"
import Link from "next/link"
import { CHNLogo } from "@/components/chn-logo"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <CHNLogo size="md" />
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Streamline Your Daily Ticket Management</h2>
          <p className="text-xl text-gray-600 mb-8">
            Upload, verify, and manage trucking delivery tickets with OCR-powered automation. Built for drivers,
            contractors, and administrators.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Manage Trucking Operations
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Upload className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Smart Upload System</CardTitle>
              <CardDescription>
                Upload ticket images with OCR-powered text extraction. Manual override available when needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Multiple image formats (JPG, PNG, PDF)</li>
                <li>• Automatic data extraction</li>
                <li>• Mobile-optimized interface</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Advanced Reporting</CardTitle>
              <CardDescription>
                Comprehensive dashboards with daily, weekly, and monthly summaries for all stakeholders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Real-time analytics</li>
                <li>• Export to Excel & PDF</li>
                <li>• Tonnage and trip tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Secure & Compliant</CardTitle>
              <CardDescription>
                Role-based access control with enterprise-grade security for all your sensitive data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• HTTPS secure uploads</li>
                <li>• Data validation</li>
                <li>• Audit trails</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Multi-Role Management</CardTitle>
              <CardDescription>
                Separate interfaces for drivers, contractor admins, and system administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Driver upload portal</li>
                <li>• Contractor management</li>
                <li>• System administration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-12 w-12 text-red-600 mb-4" />
              <CardTitle>Data Verification</CardTitle>
              <CardDescription>
                Built-in verification workflows to ensure data accuracy and resolve disputes quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Manual verification</li>
                <li>• Dispute resolution</li>
                <li>• Quality control</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Truck className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Mobile First</CardTitle>
              <CardDescription>
                Designed for drivers in the field with responsive design and offline capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Mobile-optimized UI</li>
                <li>• Touch-friendly interface</li>
                <li>• Works on any device</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl mb-8 opacity-90">Join hundreds of trucking companies already using our platform</p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/register">Create Your Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <CHNLogo size="sm" />
          <p className="text-gray-400 mt-2">© 2024 CHN Trucking Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
