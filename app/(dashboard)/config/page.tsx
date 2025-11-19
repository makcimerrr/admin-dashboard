'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Briefcase, Plane, Settings2 } from 'lucide-react';
import PromoManagement from './promo-management-new';
import HolidayManagement from './holiday-management-new';
import ProjectManagement from './project-management-new';

export default function ConfigPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground">
            Gérez les promotions, les vacances et les projets de votre plateforme
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="promos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="promos" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Promotions</span>
            <span className="sm:hidden">Promos</span>
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-2">
            <Plane className="h-4 w-4" />
            <span className="hidden sm:inline">Vacances</span>
            <span className="sm:hidden">Vacances</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Projets</span>
            <span className="sm:hidden">Projets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promos" className="mt-6">
          <PromoManagement />
        </TabsContent>

        <TabsContent value="holidays" className="mt-6">
          <HolidayManagement />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
