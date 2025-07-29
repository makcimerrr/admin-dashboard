
import { ReactNode } from "react"

interface PageContainerProps {
  children: ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="space-y-6 w-full max-w-full" style={{ overflowX: 'hidden' }}>
      {children}
    </div>
  )
}
