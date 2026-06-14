'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import type { ApexOptions } from 'apexcharts'
import { formatMoney } from '@/lib/format'
import type { CategoryExpense } from '@/lib/reports'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type Props = { data: CategoryExpense[] }

export function ExpensesByCategoryChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
        No hay gastos registrados en este mes.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.totalCRC, 0)
  const chartHeight = Math.max(data.length * 44, 100)

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: chartHeight,
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: data.map(d => d.categoryColor),
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 6,
        borderRadiusApplication: 'end',
        dataLabels: { position: 'right' },
      },
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      formatter: (_val, opts?: { dataPointIndex?: number }) => {
        const v = data[opts?.dataPointIndex ?? 0]?.totalCRC ?? 0
        const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0'
        return `${pct}%`
      },
      style: { fontSize: '12px', colors: [isDark ? '#9ca3af' : '#6b7280'] },
      offsetX: 4,
    },
    grid: {
      strokeDashArray: 4,
      borderColor: isDark ? '#27303e' : '#e6ebf1',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      labels: {
        formatter: (v: string) => {
          const n = Number(v)
          return n === 0 ? '₡0' : `₡${(n / 1000).toFixed(0)}k`
        },
        style: { fontSize: '12px' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '13px' },
        maxWidth: 160,
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (v: number) => {
          const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0'
          return `${formatMoney(v, 'CRC')} (${pct}%)`
        },
      },
    },
    legend: { show: false },
  }

  return (
    <Chart
      options={options}
      series={[{ name: 'Gastos', data: data.map(d => d.totalCRC) }]}
      type="bar"
      height={chartHeight}
    />
  )
}
