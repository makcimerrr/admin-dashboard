
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReactNode } from "react"

interface ContentCardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function ContentCard({ title, children, className = "" }: ContentCardProps) {
  return (
    <Card className={`border bg-background ${className}`}>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "p-6"}>
        {children}
      </CardContent>
    </Card>
  )
}
