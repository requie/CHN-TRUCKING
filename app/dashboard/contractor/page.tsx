"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Users, TrendingUp, AlertTriangle, Download, Eye } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"

export default function ContractorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [recentTickets] = useState([
    {
      id: "T001",
      date: "2024-01-15",
      driver: "John Smith",
      truckReg: "ABC-123",
      commodity: "Bauxite",
      weight: 25.5,
      status: "verified",
      destination: "Port Esquivel",
    },
    {
      id: "T002",
      date: "2024-01-15",
      driver: "Jane Doe",
      truckReg: "XYZ-456",
      commodity: "Alumina",
      weight: 28.0,
      status: "pending",
      destination: "Kingston Port",
    },
    {
      id: "T003",
      date: "2024-01-14",
      driver: "Bob Wilson",
      truckReg: "DEF-789",
      commodity: "Bauxite",
      weight: 26.2,
      status: "verified",
      destination: "Port Esquivel",
    },
    {
      id: "T004",
      date: "2024-01-14",
      driver: "John Smith",
      truckReg: "ABC-123",
      commodity: "Coal",
      weight: 24.8,
      status: "flagged",
      destination: "Power Plant",
    },
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const stats = {
    totalTickets: recentTickets.length,
    activeDrivers: 8,
    totalTonnage: recentTickets.reduce((sum, ticket) => sum + ticket.weight, 0),
    pendingVerification: recentTickets.filter((t) => t.status === "pending").length,
    flaggedTickets: recentTickets.filter((t) => t.status === "flagged").length,
  }

  return (
    <DashboardLayout userRole="contractor">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CHN Contractor Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name || "Admin"}! Here's your operation overview.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDrivers}</div>
              <p className="text-xs text-muted-foreground">Currently employed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tonnage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTonnage.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Tons this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerification}</div>
              <p className="text-xs text-muted-foreground">Need verification</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flaggedTickets}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/dashboard/contractor/reports">
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/contractor/drivers">
              <Users className="h-4 w-4 mr-2" />
              Manage Drivers
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/contractor/tickets">
              <FileText className="h-4 w-4 mr-2" />
              View All Tickets
            </Link>
          </Button>
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Latest delivery tickets from your drivers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">#{ticket.id}</span>
                      <Badge
                        variant={
                          ticket.status === "verified"
                            ? "default"
                            : ticket.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        Driver: {ticket.driver} | Date: {ticket.date}
                      </div>
                      <div>
                        Truck: {ticket.truckReg} | {ticket.commodity} | {ticket.weight}T
                      </div>
                      <div>Destination: {ticket.destination}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/contractor/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
