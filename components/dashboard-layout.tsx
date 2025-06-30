"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, FileText, BarChart3, Users, Settings, LogOut, Home, User } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { CHNLogo } from "@/components/chn-logo"

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole: "driver" | "contractor" | "admin"
}

export function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      router.push("/auth/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  const getMenuItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        url: `/dashboard/${userRole}`,
        icon: Home,
      },
    ]

    switch (userRole) {
      case "driver":
        return [
          ...baseItems,
          {
            title: "Upload Ticket",
            url: "/dashboard/driver/upload",
            icon: Upload,
          },
          {
            title: "My Tickets",
            url: "/dashboard/driver/tickets",
            icon: FileText,
          },
          {
            title: "Profile",
            url: "/dashboard/driver/profile",
            icon: User,
          },
        ]
      case "contractor":
        return [
          ...baseItems,
          {
            title: "All Tickets",
            url: "/dashboard/contractor/tickets",
            icon: FileText,
          },
          {
            title: "Drivers",
            url: "/dashboard/contractor/drivers",
            icon: Users,
          },
          {
            title: "Reports",
            url: "/dashboard/contractor/reports",
            icon: BarChart3,
          },
          {
            title: "Settings",
            url: "/dashboard/contractor/settings",
            icon: Settings,
          },
        ]
      case "admin":
        return [
          ...baseItems,
          {
            title: "All Tickets",
            url: "/dashboard/admin/tickets",
            icon: FileText,
          },
          {
            title: "Contractors",
            url: "/dashboard/admin/contractors",
            icon: Users,
          },
          {
            title: "Reports",
            url: "/dashboard/admin/reports",
            icon: BarChart3,
          },
          {
            title: "OCR Testing",
            url: "/dashboard/admin/ocr-testing",
            icon: Settings,
          },
          {
            title: "System Settings",
            url: "/dashboard/admin/settings",
            icon: Settings,
          },
        ]
      default:
        return baseItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-4 py-2">
            <CHNLogo size="md" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="px-4 py-2 text-sm">
                <div className="font-medium">{user?.name}</div>
                <div className="text-gray-500 capitalize">{userRole}</div>
                {user?.contractor && <div className="text-xs text-gray-400">{user.contractor}</div>}
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
