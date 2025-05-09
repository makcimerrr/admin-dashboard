'use client';

import * as React from 'react';
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal
} from 'lucide-react';

import { NavMain } from './nav-main';
import { NavProjects } from './nav-projects';
import { NavUser } from './nav-user';
import { TeamSwitcher } from './team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar';

// This is sample data.
const data = {
  navMain: [
    {
      title: 'Models',
      url: '#',
      icon: Bot,
      items: [
        {
          title: 'Phi3',
          url: '#'
        },
        {
          title: 'Llama3.2',
          url: '#'
        },
        {
          title: 'Deepseek-r1',
          url: '#'
        },
        {
          title: 'DeepSeek-LLM',
          url: '#'
        }
      ]
    },
    {
      title: 'Documentation',
      url: '/docs',
      icon: BookOpen,
      isActive: true,
      items: [
        {
          title: 'Introduction',
          url: '/hub/docs/introduction'
        },
        {
          title: 'Authentication',
          url: '/hub/docs/authentication'
        },
        {
          title: 'Endpoints',
          url: '/hub/docs/endpoints'
        },
        {
          title: 'SDKs & Integrations',
          url: '/hub/docs/sdks'
        },
        {
          title: 'Exemples',
          url: '/hub/docs/examples'
        },
        {
          title: 'FAQ',
          url: '/hub/docs/faq'
        }
      ]
    },
    {
      title: 'Ressources',
      url: '#',
      icon: Frame,
      items: [
        {
          title: 'Changelog',
          url: '#'
        },
        {
          title: "Status de l'API",
          url: '#'
        },
        {
          title: 'Support',
          url: '#'
        }
      ]
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '/settings'
        },
        {
          title: 'Account',
          url: '#'
        },
        {
          title: 'Notifications',
          url: '#'
        },
        {
          title: 'Security',
          url: '#'
        },
        {
          title: 'API Keys',
          url: '#'
        }
      ]
    }
  ],
  projects: []
};

export function AppSidebar({
  user,
  logout,
  ...props
}: {
  user: any;
  logout: any;
} & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Zone01 Dashboard</span>
                  <span className="">v1.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/*<NavProjects projects={data.projects}/>*/}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} logout={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
