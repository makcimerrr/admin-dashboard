
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import Link from "next/link"

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  actions?: Array<{
    label: string
    href: string
    icon: LucideIcon
    variant?: "default" | "outline"
  }>
}

export function PageHeader({ title, subtitle, icon: Icon, actions = [] }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Link key={index} href={action.href}>
            <Button variant={action.variant || "outline"} size="sm">
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
