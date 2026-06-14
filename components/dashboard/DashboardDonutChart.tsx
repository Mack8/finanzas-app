'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import type { ApexOptions } from 'apexcharts'
import { formatMoney } from '@/lib/format'
import type { CategoryExpense } from '@/lib/reports'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type Props = { data: CategoryExpense[] }

export function DashboardDonutChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sin gastos registrados.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.totalCRC, 0)

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'inherit',
      background: 'transparent',
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: data.map(d => d.categoryColor),
    labels: data.map(d => d.categoryName),
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '12px',
              formatter: () => formatMoney(total, 'CRC'),
            },
          },
        },
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
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '12px',
      markers: { size: 8 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    stroke: { width: 0 },
  }

  return (
    <Chart
      options={options}
      series={data.map(d => d.totalCRC)}
      type="donut"
      height={220}
    />
  )
}
