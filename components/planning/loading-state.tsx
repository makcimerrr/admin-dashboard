
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  type?: "skeleton" | "spinner"
  rows?: number
  className?: string
}

export function LoadingState({ type = "skeleton", rows = 3, className = "" }: LoadingStateProps) {
  if (type === "spinner") {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
