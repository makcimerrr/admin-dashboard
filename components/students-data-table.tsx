"use client"

import * as React from "react"
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDownIcon, ColumnsIcon, GraduationCapIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ClientImport from "@/components/client-import"
import AddStudent from "@/components/add-student"
import { columns } from "@/components/students/student-columns"
import { StudentTableContent } from "./students/student-table-content"
import type { Student } from "./students/student-detail-viewer"

interface Promo {
  key: string
  eventId: number
  title: string
}

interface StudentsDataTableProps {
  data: Student[]
  promos: Promo[]
  currentOffset: number
  newOffset: number | null
  totalStudents: number
  previousOffset: number | null
  search: string
  promo: string
  eventId: string
  currentStatus?: string
  currentDelayLevel?: string
}

export function StudentsDataTable({
                                    data: initialData,
                                    promos,
                                    currentOffset,
                                    newOffset,
                                    totalStudents,
                                    previousOffset,
                                    search,
                                    promo,
                                    eventId,
                                    currentStatus,
                                    currentDelayLevel,
                                  }: StudentsDataTableProps) {
  const pageSize = 20 // Taille fixe
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    // Masquer certaines colonnes par défaut pour éviter le débordement
    rust_completed: false,
    actual_project_name: false,
    availableAt: false,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: Math.floor(currentOffset / pageSize),
    pageSize: pageSize,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount: Math.ceil(totalStudents / pageSize),
  })

  // Navigation functions
  const buildUrl = (newOffset: number, newPromo?: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (newOffset > 0) params.set("offset", newOffset.toString())
    if (newPromo !== undefined) params.set("promo", newPromo)
    else if (promo) params.set("promo", promo)

    // Add filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
    } else {
      // Préserver les filtres existants
      if (currentStatus) params.set("status", currentStatus)
      if (currentDelayLevel) params.set("delay_level", currentDelayLevel)
    }

    return `/students?${params.toString()}`
  }

  const handleNextPage = () => {
    if (newOffset !== null) {
      window.location.href = buildUrl(newOffset)
    }
  }

  const handlePreviousPage = () => {
    if (previousOffset !== null) {
      window.location.href = buildUrl(previousOffset)
    }
  }

  const handleFirstPage = () => {
    window.location.href = buildUrl(0)
  }

  const handleLastPage = () => {
    const lastOffset = Math.floor(totalStudents / pageSize) * pageSize
    window.location.href = buildUrl(lastOffset)
  }

  const handleStatusFilter = (status: string) => {
    const filters: Record<string, string> = {}
    if (status) filters.status = status
    if (currentDelayLevel) filters.delay_level = currentDelayLevel
    window.location.href = buildUrl(0, promo, filters)
  }

  const handleDelayLevelFilter = (delayLevel: string) => {
    const filters: Record<string, string> = {}
    if (currentStatus) filters.status = currentStatus
    if (delayLevel) filters.delay_level = delayLevel
    window.location.href = buildUrl(0, promo, filters)
  }

  const clearFilters = () => {
    window.location.href = buildUrl(0, promo, {})
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GraduationCapIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Students</h1>
        </div>
        <div className="flex items-center gap-2">
          <ClientImport />
          <AddStudent />
        </div>
      </div>

      <Tabs value={promo || "all"} className="flex w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="view-selector" className="sr-only">
              View
            </Label>
            <Select
              value={promo || "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  window.location.href = buildUrl(0, "")
                } else {
                  window.location.href = buildUrl(0, value)
                }
              }}
            >
              <SelectTrigger className="@4xl/main:hidden flex w-fit" id="view-selector">
                <SelectValue placeholder="Select a promo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les promotions</SelectItem>
                {promos.map(({ key, title }) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TabsList className="@4xl/main:flex hidden">
              <TabsTrigger value="all" asChild>
                <a href={buildUrl(0, "")} className="transition-all duration-300 hover:text-blue-600">
                  Toutes les promotions
                </a>
              </TabsTrigger>
              {promos.map(({ key, title }) => (
                <TabsTrigger key={key} value={key} asChild>
                  <a href={buildUrl(0, key)} className="transition-all duration-300 hover:text-blue-600">
                    {key}
                  </a>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ColumnsIcon />
                  <span className="hidden lg:inline">Customize Columns</span>
                  <span className="lg:hidden">Columns</span>
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id.replace(/_/g, " ")}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto">
          <StudentTableContent
            table={table}
            data={data}
            columns={columns}
            totalStudents={totalStudents}
            currentOffset={currentOffset}
            newOffset={newOffset}
            previousOffset={previousOffset}
            currentStatus={currentStatus}
            currentDelayLevel={currentDelayLevel}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
            onFirstPage={handleFirstPage}
            onLastPage={handleLastPage}
            onStatusFilter={handleStatusFilter}
            onDelayLevelFilter={handleDelayLevelFilter}
            onClearFilters={clearFilters}
          />
        </TabsContent>

        {promos.map(({ key, title }) => (
          <TabsContent key={key} value={key} className="relative flex flex-col gap-4 overflow-auto">
            <StudentTableContent
              table={table}
              data={data}
              columns={columns}
              totalStudents={totalStudents}
              currentOffset={currentOffset}
              newOffset={newOffset}
              previousOffset={previousOffset}
              currentStatus={currentStatus}
              currentDelayLevel={currentDelayLevel}
              onNextPage={handleNextPage}
              onPreviousPage={handlePreviousPage}
              onFirstPage={handleFirstPage}
              onLastPage={handleLastPage}
              onStatusFilter={handleStatusFilter}
              onDelayLevelFilter={handleDelayLevelFilter}
              onClearFilters={clearFilters}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
