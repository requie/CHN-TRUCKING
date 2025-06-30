"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, BarChart3, Filter } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function ContractorReportsPage() {
  const [dateRange, setDateRange] = useState("last_30_days")
  const [reportType, setReportType] = useState("summary")
  const [selectedDriver, setSelectedDriver] = useState("all")

  const [reportData] = useState({
    summary: {
      totalTickets: 156,
      totalTonnage: 3420.5,
      averageWeight: 21.9,
      topDriver: "John Smith",
      topCommodity: "Bauxite",
    },
    drivers: [
      { name: "John Smith", tickets: 45, tonnage: 987.5, avgWeight: 21.9 },
      { name: "Jane Doe", tickets: 38, tonnage: 834.2, avgWeight: 22.0 },
      { name: "Bob Wilson", tickets: 42, tonnage: 924.8, avgWeight: 22.0 },
      { name: "Sarah Johnson", tickets: 31, tonnage: 674.0, avgWeight: 21.7 },
    ],
    commodities: [
      { name: "Bauxite", tickets: 89, tonnage: 1945.3, percentage: 56.9 },
      { name: "Alumina", tickets: 34, tonnage: 748.2, percentage: 21.9 },
      { name: "Coal", tickets: 23, tonnage: 506.1, percentage: 14.8 },
      { name: "Limestone", tickets: 10, tonnage: 220.9, percentage: 6.4 },
    ],
  })

  const handleExport = (format: "excel" | "pdf") => {
    // Simulate export
    alert(`Exporting report as ${format.toUpperCase()}...`)
  }

  return (
    <DashboardLayout userRole="contractor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Generate and export detailed reports for your trucking operations</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="driver_performance">Driver Performance</SelectItem>
                    <SelectItem value="commodity_analysis">Commodity Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver">Driver</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    <SelectItem value="john_smith">John Smith</SelectItem>
                    <SelectItem value="jane_doe">Jane Doe</SelectItem>
                    <SelectItem value="bob_wilson">Bob Wilson</SelectItem>
                    <SelectItem value="sarah_johnson">Sarah Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex gap-2">
                  <Button onClick={() => handleExport("excel")} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button onClick={() => handleExport("pdf")} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.summary.totalTickets}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tonnage</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.summary.totalTonnage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Tons delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Weight</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.summary.averageWeight}</div>
              <p className="text-xs text-muted-foreground">Tons per load</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Driver</CardTitle>
              <Badge variant="outline">{reportData.summary.topDriver}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">Most deliveries</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Commodity</CardTitle>
              <Badge variant="outline">{reportData.summary.topCommodity}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">Most transported</div>
              <p className="text-xs text-muted-foreground">By volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Driver Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Performance</CardTitle>
            <CardDescription>Performance metrics for each driver</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.drivers.map((driver, index) => (
                <div key={driver.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-sm text-gray-500">
                        {driver.tickets} tickets | {driver.tonnage.toFixed(1)} tons
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{driver.avgWeight.toFixed(1)} T</div>
                    <div className="text-sm text-gray-500">Avg per load</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commodity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Commodity Analysis</CardTitle>
            <CardDescription>Breakdown by commodity type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.commodities.map((commodity) => (
                <div key={commodity.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{commodity.name}</span>
                    <span className="text-sm text-gray-500">{commodity.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${commodity.percentage}%` }}></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{commodity.tickets} tickets</span>
                    <span>{commodity.tonnage.toFixed(1)} tons</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
