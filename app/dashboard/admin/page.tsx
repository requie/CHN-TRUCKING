"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Users, Building2, TrendingUp, AlertTriangle, Download, Eye, Settings } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [systemStats] = useState({
    totalTickets: 1247,
    totalContractors: 12,
    totalDrivers: 89,
    totalTonnage: 15420.5,
    pendingTickets: 23,
    flaggedTickets: 7,
    activeUsers: 67,
  })

  const [recentActivity] = useState([
    {
      id: "A001",
      type: "ticket_upload",
      description: "New ticket uploaded by John Smith (ABC Trucking)",
      timestamp: "2 minutes ago",
      status: "pending",
    },
    {
      id: "A002",
      type: "contractor_registered",
      description: "New contractor registered: XYZ Transport Ltd",
      timestamp: "1 hour ago",
      status: "completed",
    },
    {
      id: "A003",
      type: "ticket_flagged",
      description: "Ticket T-4521 flagged for review (weight discrepancy)",
      timestamp: "3 hours ago",
      status: "flagged",
    },
    {
      id: "A004",
      type: "driver_added",
      description: "New driver added to Quick Haul: Sarah Johnson",
      timestamp: "5 hours ago",
      status: "completed",
    },
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CHN System Administration</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.name || "Administrator"}! Here's your system overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalTickets}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contractors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalContractors}</div>
              <p className="text-xs text-muted-foreground">Active companies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalDrivers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tonnage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalTonnage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Tons processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Pending Review</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{systemStats.pendingTickets}</div>
              <p className="text-xs text-yellow-700">Tickets awaiting verification</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Flagged Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">{systemStats.flaggedTickets}</div>
              <p className="text-xs text-red-700">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Active Users</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{systemStats.activeUsers}</div>
              <p className="text-xs text-green-700">Online in last 24h</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/dashboard/admin/reports">
              <Download className="h-4 w-4 mr-2" />
              System Reports
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/contractors">
              <Building2 className="h-4 w-4 mr-2" />
              Manage Contractors
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/tickets">
              <FileText className="h-4 w-4 mr-2" />
              Review Tickets
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/settings">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Link>
          </Button>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge
                        variant={
                          activity.status === "completed"
                            ? "default"
                            : activity.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {activity.status}
                      </Badge>
                      <span className="text-sm text-gray-500">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm font-medium">{activity.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline">View All Activity</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
