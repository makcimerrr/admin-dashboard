import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { ReactNode } from "react"

interface Column<T> {
  key: keyof T
  header: string
  // Generic table render: value's type is inferred at call site via the
  // column's key. Using `any` here is idiomatic for table helpers — see
  // shadcn/ui, ant-design Table, etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  emptyMessage = "Aucune donnée à afficher",
  className = ""
}: DataTableProps<T>) {
  return (
    <div className={`rounded-lg border bg-background overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.key)} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState title={emptyMessage} size="compact" />
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className={column.className}>
                    {column.render
                      ? column.render(item[column.key], item)
                      : (item[column.key] as ReactNode)
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
