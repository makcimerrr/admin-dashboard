"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { TrendingUpIcon } from "lucide-react"

import { useIsMobile } from "@/components/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export interface Student {
  id: number
  first_name: string
  last_name: string
  login: string
  promos: string
  golang_completed: boolean
  javascript_completed: boolean
  rust_completed: boolean
  actual_project_name?: string
  progress_status: string
  delay_level: string
  availableAt?: string
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface StudentDetailViewerProps {
  student: Student
}

export function StudentDetailViewer({ student }: StudentDetailViewerProps) {
  const isMobile = useIsMobile()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {student.first_name}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>
            {student.first_name} {student.last_name}
          </SheetTitle>
          <SheetDescription>Student details and information</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 font-medium leading-none">
                  Student performance overview <TrendingUpIcon className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Academic progress and engagement metrics for the last 6 months.
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" defaultValue={student.first_name} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" defaultValue={student.last_name} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="login">Login</Label>
              <Input id="login" defaultValue={student.login} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="promo">Promo</Label>
                <Select defaultValue={student.promos}>
                  <SelectTrigger id="promo" className="w-full">
                    <SelectValue placeholder="Select a promo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024A">2024A</SelectItem>
                    <SelectItem value="2024B">2024B</SelectItem>
                    <SelectItem value="2023A">2023A</SelectItem>
                    <SelectItem value="2023B">2023B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={student.progress_status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="working">Working</SelectItem>
                    <SelectItem value="without group">Without Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="delayLevel">Delay Level</Label>
              <Select defaultValue={student.delay_level}>
                <SelectTrigger id="delayLevel" className="w-full">
                  <SelectValue placeholder="Select delay level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bien">Bien</SelectItem>
                  <SelectItem value="en retard">En Retard</SelectItem>
                  <SelectItem value="en avance">En Avance</SelectItem>
                  <SelectItem value="spécialité">Spécialité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="availableAt">Available At</Label>
              <Input
                id="availableAt"
                type="date"
                defaultValue={student.availableAt ? new Date(student.availableAt).toISOString().split("T")[0] : ""}
              />
            </div>
          </form>
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full">Save Changes</Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
