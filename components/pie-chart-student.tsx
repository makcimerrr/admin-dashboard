"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const delayLevelData = [
  { level: "bien", count: 186, fill: "var(--color-bien)" },
  { level: "retard", count: 305, fill: "var(--color-retard)" },
  { level: "avance", count: 237, fill: "var(--color-avance)" },
  { level: "spécialité", count: 173, fill: "var(--color-spécialité)" },
]

const chartConfig = {
  bien: {
    label: "Bien",
    color: "hsl(var(--chart-1))",
  },
  retard: {
    label: "En Retard",
    color: "hsl(var(--chart-2))",
  },
  avance: {
    label: "En Avance",
    color: "hsl(var(--chart-3))",
  },
  spécialité: {
    label: "Spécialité",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

export function Component() {
  const id = "pie-interactive"
  const [activeLevel, setActiveLevel] = React.useState(delayLevelData[0].level)

  const activeIndex = React.useMemo(
    () => delayLevelData.findIndex((item) => item.level === activeLevel),
    [activeLevel]
  )
  const levels = React.useMemo(() => delayLevelData.map((item) => item.level), [])

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>Pie Chart - Interactive</CardTitle>
          <CardDescription>Delay Levels</CardDescription>
        </div>
        <Select value={activeLevel} onValueChange={setActiveLevel}>
          <SelectTrigger
            className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {levels.map((key) => {
              const config = chartConfig[key as keyof typeof chartConfig]

              if (!config) {
                return null
              }

              return (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: `var(--color-${key})`,
                      }}
                    />
                    {config?.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={delayLevelData}
              dataKey="count"
              nameKey="level"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                              outerRadius = 0,
                              ...props
                            }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {delayLevelData[activeIndex].count.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Students
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default Component