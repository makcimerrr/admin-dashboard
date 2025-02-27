import * as React from "react"
import { SearchForm } from "@/components/search-form"
import { GalleryVerticalEnd, Minus, Plus } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
    SidebarRail
} from '@/components/ui/sidebar';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {NavUser} from "./nav-user";

const data = {
    navMain: [
        {
            title: "Gestion des promotions",
            url: "/config/promotions",
            items: [
                {
                    title: "Liste des promotions",
                    url: "/config/promotions/list",
                    isActive: true,
                },
                {
                    title: "Timeline des promotions",
                    url: "/config/promotions/timeline",
                },
            ],
        },
        {
            title: "Projets",
            url: "/config/projets",
            items: [
                {
                    title: "Liste des projets",
                    url: "/config/projets/list",
                },
                {
                    title: "Configuration des projets",
                    url: "/config/projets/settings",
                },
            ],
        },
        {
            title: "Vacances",
            url: "/config/vacances",
            items: [
                {
                    title: "Planning des vacances",
                    url: "/config/vacances/planning",
                },
                {
                    title: "Ajouter des périodes",
                    url: "/config/vacances/add",
                },
            ],
        },
        {
            title: "Utilisateurs",
            url: "/config/utilisateurs",
            items: [
                {
                    title: "Gestion des utilisateurs",
                    url: "/config/utilisateurs/manage",
                },
                {
                    title: "Rôles et permissions",
                    url: "/config/utilisateurs/roles",
                },
            ],
        },
        {
            title: "Paramètres globaux",
            url: "/config/parametres",
            items: [
                {
                    title: "Configuration générale",
                    url: "/config/parametres/general",
                },
                {
                    title: "Logs et diagnostics",
                    url: "/config/parametres/logs",
                },
            ],
        },
    ],
};

export function AppSidebar({user, logout, ...props}: { user: any, logout: any} & React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <GalleryVerticalEnd className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">Zone01 Rouen</span>
                                    <span className="">v1.0.0</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {data.navMain.map((item, index) => (
                            <Collapsible
                                key={item.title}
                                defaultOpen={index === 1}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            {item.title}{" "}
                                            <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                                            <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    {item.items?.length ? (
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items.map((item) => (
                                                    <SidebarMenuSubItem key={item.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={item.isActive}
                                                        >
                                                            <a href={item.url}>{item.title}</a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    ) : null}
                                </SidebarMenuItem>
                            </Collapsible>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} logout={logout}/>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
