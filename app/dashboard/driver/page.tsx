"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Calendar, TrendingUp, Plus, Eye } from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null)
  const [recentTickets] = useState([
    {
      id: "T001",
      date: "2024-01-15",
      truckReg: "ABC-123",
      commodity: "Bauxite",
      weight: 25.5,
      status: "verified",
      destination: "Port Esquivel",
    },
    {
      id: "T002",
      date: "2024-01-14",
      truckReg: "ABC-123",
      commodity: "Alumina",
      weight: 28.0,
      status: "pending",
      destination: "Kingston Port",
    },
    {
      id: "T003",
      date: "2024-01-13",
      truckReg: "ABC-123",
      commodity: "Bauxite",
      weight: 26.2,
      status: "verified",
      destination: "Port Esquivel",
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
    thisWeek: 5,
    totalTonnage: recentTickets.reduce((sum, ticket) => sum + ticket.weight, 0),
    pendingVerification: recentTickets.filter((t) => t.status === "pending").length,
  }

  return (
    <DashboardLayout userRole="driver">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name || "Driver"}!</h1>
          <p className="text-gray-600 mt-2">CHN Trucking Portal - Contractor: {user?.contractor || "ABC Trucking"}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/dashboard/driver/upload">
              <Plus className="h-4 w-4 mr-2" />
              Upload New Ticket
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/driver/tickets">
              <FileText className="h-4 w-4 mr-2" />
              View All Tickets
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground">+2 from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tonnage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTonnage.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Tons delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerification}</div>
              <p className="text-xs text-muted-foreground">Awaiting verification</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Your latest delivery ticket uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">#{ticket.id}</span>
                      <Badge variant={ticket.status === "verified" ? "default" : "secondary"}>{ticket.status}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Date: {ticket.date}</div>
                      <div>
                        Truck: {ticket.truckReg} | {ticket.commodity} | {ticket.weight}T
                      </div>
                      <div>Destination: {ticket.destination}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/driver/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
