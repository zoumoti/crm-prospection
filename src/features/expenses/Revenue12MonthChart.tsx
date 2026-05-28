import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatExpenseAmount } from './format'

export interface MonthlySummary {
  month: string  // 'YYYY-MM'
  label: string  // 'Mai 26'
  revenues: number
  expenses: number
}

interface Revenue12MonthChartProps {
  data: MonthlySummary[]       // length = 12, oldest first
  selectedMonth: string        // 'YYYY-MM' to highlight
}

export function Revenue12MonthChart({ data, selectedMonth }: Revenue12MonthChartProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] h-[220px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              formatter={(v, name) => [formatExpenseAmount(Number(v ?? 0)), String(name ?? '')]}
              labelFormatter={(l) => String(l)}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: 12,
              }}
            />
            <Bar dataKey="revenues" name="Revenus" stackId="m" radius={[0, 0, 4, 4]}>
              {data.map((d) => (
                <Cell
                  key={`r-${d.month}`}
                  fill="var(--color-accent)"
                  fillOpacity={d.month === selectedMonth ? 1 : 0.7}
                />
              ))}
            </Bar>
            <Bar dataKey="expenses" name="Dépenses" stackId="m" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={`e-${d.month}`}
                  fill="var(--color-border)"
                  fillOpacity={d.month === selectedMonth ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
