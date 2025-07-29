
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Icon className="h-8 w-8 text-blue-600" />
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Link key={index} href={action.href}>
            <Button variant={action.variant || "outline"}>
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
