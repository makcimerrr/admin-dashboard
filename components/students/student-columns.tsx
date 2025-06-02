"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, MoreVerticalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StudentDetailViewer, type Student } from "./student-detail-viewer"

export const columns: ColumnDef<Student>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        First Name
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => <StudentDetailViewer student={row.original} />,
    enableHiding: false,
  },
  {
    accessorKey: "last_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Last Name
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.original.last_name}</div>,
  },
  {
    accessorKey: "login",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Login
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => <div className="text-muted-foreground">{row.original.login}</div>,
  },
  {
    accessorKey: "promos",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Promo
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.promos}
      </Badge>
    ),
  },
  {
    accessorKey: "golang_completed",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Golang
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3">
        {row.original.golang_completed ? (
          <CheckCircle2Icon className="text-green-500 dark:text-green-400" />
        ) : (
          <div className="size-3 rounded-full bg-muted" />
        )}
        {row.original.golang_completed ? "Done" : "Pending"}
      </Badge>
    ),
  },
  {
    accessorKey: "javascript_completed",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        JavaScript
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3">
        {row.original.javascript_completed ? (
          <CheckCircle2Icon className="text-green-500 dark:text-green-400" />
        ) : (
          <div className="size-3 rounded-full bg-muted" />
        )}
        {row.original.javascript_completed ? "Done" : "Pending"}
      </Badge>
    ),
  },
  {
    accessorKey: "rust_completed",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Rust
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3">
        {row.original.rust_completed ? (
          <CheckCircle2Icon className="text-green-500 dark:text-green-400" />
        ) : (
          <div className="size-3 rounded-full bg-muted" />
        )}
        {row.original.rust_completed ? "Done" : "Pending"}
      </Badge>
    ),
  },
  {
    accessorKey: "actual_project_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Current Project
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground max-w-32 truncate">{row.original.actual_project_name || "N/A"}</div>
    ),
  },
  {
    accessorKey: "progress_status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Status
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.progress_status}
      </Badge>
    ),
  },
  {
    accessorKey: "delay_level",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Delay Level
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.delay_level === "bien" ? "default" : "secondary"} className="px-1.5">
        {row.original.delay_level}
      </Badge>
    ),
  },
  {
    accessorKey: "availableAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Available At
        {column.getIsSorted() === "asc" ? (
          <ChevronUpIcon className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.availableAt ? new Date(row.original.availableAt).toLocaleDateString() : "N/A"}
      </div>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
            <MoreVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Send Email</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
