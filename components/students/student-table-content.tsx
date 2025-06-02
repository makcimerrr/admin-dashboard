"use client"

import type { Table as ReactTable } from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"
import { flexRender } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StudentFilters } from "@/components/students/student-filters"
import type { Student } from "./student-detail-viewer"

interface StudentTableContentProps {
  table: ReactTable<Student>
  data: Student[]
  columns: any[]
  totalStudents: number
  currentOffset: number
  newOffset: number | null
  previousOffset: number | null
  currentStatus?: string
  currentDelayLevel?: string
  onNextPage: () => void
  onPreviousPage: () => void
  onFirstPage: () => void
  onLastPage: () => void
  onStatusFilter: (status: string) => void
  onDelayLevelFilter: (delayLevel: string) => void
  onClearFilters: () => void
}

export function StudentTableContent({
                                      table,
                                      data,
                                      columns,
                                      totalStudents,
                                      currentOffset,
                                      newOffset,
                                      previousOffset,
                                      currentStatus,
                                      currentDelayLevel,
                                      onNextPage,
                                      onPreviousPage,
                                      onFirstPage,
                                      onLastPage,
                                      onStatusFilter,
                                      onDelayLevelFilter,
                                      onClearFilters,
                                    }: StudentTableContentProps) {
  const pageSize = 20

  return (
    <>
      <StudentFilters
        currentStatus={currentStatus}
        currentDelayLevel={currentDelayLevel}
        onStatusFilter={onStatusFilter}
        onDelayLevelFilter={onDelayLevelFilter}
        onClearFilters={onClearFilters}
      />

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan} className="whitespace-nowrap">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
          selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Showing {currentOffset + 1} to {Math.min(currentOffset + data.length, totalStudents)} of {totalStudents}{" "}
            students
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={onFirstPage}
              disabled={currentOffset === 0}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={onPreviousPage}
              disabled={previousOffset === null}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={onNextPage} disabled={newOffset === null}>
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={onLastPage}
              disabled={newOffset === null}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
