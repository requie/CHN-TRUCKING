"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Download, Calendar } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function DriverTicketsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  const [tickets] = useState([
    {
      id: "T001",
      ticketNumber: "TK-2024-001",
      date: "2024-01-15",
      truckReg: "ABC-123",
      commodity: "Bauxite",
      weight: 25.5,
      status: "verified",
      destination: "Port Esquivel",
      loadingLocation: "Mine Site A",
      dispatcher: "Mike Johnson",
    },
    {
      id: "T002",
      ticketNumber: "TK-2024-002",
      date: "2024-01-14",
      truckReg: "ABC-123",
      commodity: "Alumina",
      weight: 28.0,
      status: "pending",
      destination: "Kingston Port",
      loadingLocation: "Processing Plant B",
      dispatcher: "Sarah Wilson",
    },
    {
      id: "T003",
      ticketNumber: "TK-2024-003",
      date: "2024-01-13",
      truckReg: "ABC-123",
      commodity: "Bauxite",
      weight: 26.2,
      status: "verified",
      destination: "Port Esquivel",
      loadingLocation: "Mine Site A",
      dispatcher: "Mike Johnson",
    },
    {
      id: "T004",
      ticketNumber: "TK-2024-004",
      date: "2024-01-12",
      truckReg: "ABC-123",
      commodity: "Coal",
      weight: 24.8,
      status: "flagged",
      destination: "Power Plant",
      loadingLocation: "Coal Yard",
      dispatcher: "Tom Brown",
    },
    {
      id: "T005",
      ticketNumber: "TK-2024-005",
      date: "2024-01-11",
      truckReg: "ABC-123",
      commodity: "Limestone",
      weight: 23.1,
      status: "verified",
      destination: "Cement Factory",
      loadingLocation: "Quarry Site",
      dispatcher: "Lisa Davis",
    },
  ])

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.destination.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "default"
      case "pending":
        return "secondary"
      case "flagged":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <DashboardLayout userRole="driver">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-gray-600 mt-2">View and manage all your delivery tickets</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg">{ticket.ticketNumber}</h3>
                      <Badge variant={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Date:</span> {ticket.date}
                        </div>
                        <div>
                          <span className="font-medium">Truck:</span> {ticket.truckReg}
                        </div>
                        <div>
                          <span className="font-medium">Commodity:</span> {ticket.commodity}
                        </div>
                        <div>
                          <span className="font-medium">Weight:</span> {ticket.weight} tons
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">From:</span> {ticket.loadingLocation}
                        </div>
                        <div>
                          <span className="font-medium">To:</span> {ticket.destination}
                        </div>
                        <div>
                          <span className="font-medium">Dispatcher:</span> {ticket.dispatcher}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTickets.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{tickets.length}</div>
                <div className="text-sm text-gray-500">Total Tickets</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{tickets.filter((t) => t.status === "verified").length}</div>
                <div className="text-sm text-gray-500">Verified</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{tickets.filter((t) => t.status === "pending").length}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {tickets.reduce((sum, ticket) => sum + ticket.weight, 0).toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Total Tons</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
