'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import type { ApexOptions } from 'apexcharts'
import { formatMoney } from '@/lib/format'
import type { MonthlyTotalsRow } from '@/lib/reports'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type Props = { data: MonthlyTotalsRow[] }

export function MonthlyTotalsChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
        No hay transacciones registradas en los últimos 6 meses.
      </div>
    )
  }

  const categories = data.map(r =>
    new Intl.DateTimeFormat('es-CR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
      new Date(`${r.month}-01T00:00:00Z`)
    )
  )

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: 280,
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#22ad5c', '#f23030', '#3c50e0'],
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: { enabled: false },
    grid: {
      strokeDashArray: 4,
      borderColor: isDark ? '#27303e' : '#e6ebf1',
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => v === 0 ? '₡0' : `₡${(v / 1000).toFixed(0)}k`,
        style: { fontSize: '12px' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => formatMoney(v, 'CRC') },
    },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '13px',
      markers: { size: 8 },
      itemMargin: { horizontal: 12 },
    },
  }

  const series = [
    { name: 'Ingresos', data: data.map(r => r.income) },
    { name: 'Gastos',   data: data.map(r => r.expenses) },
    { name: 'Ahorro',   data: data.map(r => r.savings) },
  ]

  return <Chart options={options} series={series} type="bar" height={280} />
}
