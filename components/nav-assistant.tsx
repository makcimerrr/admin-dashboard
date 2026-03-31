"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, MessageSquare, HelpCircle, Settings, Sparkles, BrainCircuit } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavAssistant() {
  const pathname = usePathname()
  const isActive = pathname.startsWith('/assistant')

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/60">
        Assistant IA
      </SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible defaultOpen={isActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className={cn(
                  "data-[state=open]:bg-accent/50",
                  isActive && "bg-accent"
                )}
              >
                <BrainCircuit className="h-4 w-4 text-violet-600" />
                <span className="font-medium">Nova</span>
                <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">AI</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === '/assistant' || (pathname.startsWith('/assistant/') && !pathname.includes('/settings') && !pathname.includes('/help'))}
                  >
                    <Link href="/assistant">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname.startsWith('/assistant/help')}
                  >
                    <Link href="/assistant/help">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Aide</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname.startsWith('/assistant/settings')}
                  >
                    <Link href="/assistant/settings">
                      <Settings className="h-3.5 w-3.5" />
                      <span>Paramètres</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )
}
