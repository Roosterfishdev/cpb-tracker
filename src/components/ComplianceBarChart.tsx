import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

export interface ComplianceBarDatum {
  label: string
  count: number
  isToday: boolean
}

interface ComplianceBarChartProps {
  data: ComplianceBarDatum[]
  target?: number
  maxSlots: number
}

export function ComplianceBarChart({ data, target, maxSlots }: ComplianceBarChartProps) {
  const targetLine = target ?? maxSlots

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#E0E4DC"
            vertical={false}
            horizontalPoints={[]}
          />
          <ReferenceLine
            y={targetLine}
            stroke="#8A8F88"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8A8F88', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            hide
            domain={[0, maxSlots]}
          />
          <Bar dataKey="count" radius={[999, 999, 999, 999]} maxBarSize={36}>
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={entry.isToday ? '#A3E635' : '#E5E9E0'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
