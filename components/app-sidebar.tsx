"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  BotIcon,
  CalendarIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NavAssistant } from "@/components/nav-assistant"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Students",
      url: "/students",
      icon: ListIcon,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChartIcon,
    },
    {
      title: "Planning",
      url: "/planning",
      icon: ClipboardListIcon,
      items: [
        {
          title: "Absences",
          url: "/planning/absences",
        },
        {
          title: "Extraction",
          url: "/planning/extraction",
        },
        {
          title: "Employés",
          url: "/employees",
        },
        {
          title: "Historique",
          url: "/history",
        }
      ],
    },
    {
      title: "Config",
      url: "/config",
      icon: FolderIcon,
    },
    {
      title: "01 Deck",
      url: "/01deck",
      icon: UsersIcon,
    },
    {
      title: "Événements",
      url: "/hub/events",
      icon: CalendarIcon,
    },
    {
      title: "Calendrier",
      url: "/hub/calendar",
      icon: ClipboardListIcon,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: CameraIcon,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: FileTextIcon,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: FileCodeIcon,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/promos/status",
      icon: DatabaseIcon,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: ClipboardListIcon,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: FileIcon,
    },
  ],
}

let User: {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: string
} | undefined

function NavMenu({ items }: { items: typeof data.navMain }) {
  const [openMenus, setOpenMenus] = React.useState<string | null>(null)
  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => (prev === title ? null : title))
  }
  return (
    <nav className="space-y-1 relative">
      {items.map((item) => {
        const isOpen = openMenus === item.title
        return (
          <div key={item.title}>
            <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted hover:text-foreground">
              <Link
                href={item.url}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
              {Array.isArray(item.items) && item.items.length > 0 && (
                <button
                  onClick={() => toggleMenu(item.title)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {Array.isArray(item.items) && item.items.length > 0 && isOpen && (
              <div className="ml-6 mt-1 space-y-1">
                {item.items.map((subItem) => (
                  <Link
                    key={subItem.title}
                    href={subItem.url}
                    className="flex items-center gap-2 rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-xs">•</span>
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: typeof User }) {
  return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                  asChild
                  className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <a href="https://zone01rouennormandie.org/">
                  <ArrowUpCircleIcon className="h-5 w-5" />
                  <span className="text-base font-semibold">Zone01 Rouen</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMenu items={data.navMain} />
          <NavAssistant />
          <NavDocuments items={data.documents} />
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user}/>
        </SidebarFooter>
      </Sidebar>
  )
}