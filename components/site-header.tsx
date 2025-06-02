import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardBreadcrumb } from '../app/(dashboard)/get-breadcrumb-items';
import { Suspense } from 'react';
import { SearchInput } from '../app/(dashboard)/search';
import DarkModeToggle from '@/components/dark-mode';

export function SiteHeader() {
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">
          <Suspense fallback={<div>Loading breadcrumbs...</div>}>
            <DashboardBreadcrumb />
          </Suspense>
        </h1>
        <SearchInput />
        <DarkModeToggle className="sm:hidden" />
      </div>
    </header>
  );
}
