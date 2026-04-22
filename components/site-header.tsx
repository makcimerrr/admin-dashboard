import { DashboardBreadcrumb } from '../app/(dashboard)/get-breadcrumb-items';

export function SiteHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <DashboardBreadcrumb />
      </div>
    </header>
  );
}
