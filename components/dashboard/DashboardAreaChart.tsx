'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import type { ApexOptions } from 'apexcharts'
import { formatMoney } from '@/lib/format'
import type { MonthlyTotalsRow } from '@/lib/reports'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type Props = { data: MonthlyTotalsRow[] }

export function DashboardAreaChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sin datos disponibles.
      </div>
    )
  }

  const categories = data.map(r =>
    new Intl.DateTimeFormat('es-CR', { month: 'short', timeZone: 'UTC' }).format(
      new Date(`${r.month}-01T00:00:00Z`)
    )
  )

  const options: ApexOptions = {
    chart: {
      type: 'area',
      height: 200,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#16a34a', '#dc2626'],
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.35, opacityTo: 0.02 },
    },
    stroke: { curve: 'smooth', width: 2.5 },
    dataLabels: { enabled: false },
    grid: {
      strokeDashArray: 4,
      borderColor: isDark ? '#1f2937' : '#e2e8f0',
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => v === 0 ? '₡0' : `₡${(v / 1000).toFixed(0)}k`,
        style: { fontSize: '11px' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => formatMoney(v, 'CRC') },
    },
    legend: { show: false },
  }

  const series = [
    { name: 'Ingresos', data: data.map(r => r.income) },
    { name: 'Gastos',   data: data.map(r => r.expenses) },
  ]

  return (
    <div className="-mx-1">
      <Chart options={options} series={series} type="area" height={200} />
    </div>
  )
}
