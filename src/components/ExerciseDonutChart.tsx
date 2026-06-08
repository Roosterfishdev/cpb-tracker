import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS: Record<string, string> = {
  walking: '#A3E635',
  padel: '#9FC8EC',
  boxing: '#F8B5B5',
  gym: '#F7D98B',
  other: '#C4B5FD',
}

const LABELS: Record<string, string> = {
  walking: 'Walking',
  padel: 'Padel',
  boxing: 'Boxing',
  gym: 'Gym',
  other: 'Other',
}

export interface ExerciseDonutDatum {
  type: string
  count: number
}

interface ExerciseDonutChartProps {
  data: ExerciseDonutDatum[]
}

export function ExerciseDonutChart({ data }: ExerciseDonutChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm font-medium text-muted">
        Log exercise this phase to see your breakdown.
      </p>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.type} fill={COLORS[entry.type] ?? '#E5E9E0'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
        {data.map((entry) => (
          <div key={entry.type} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[entry.type] ?? '#E5E9E0' }}
            />
            <span className="text-sm font-medium text-foreground">
              {LABELS[entry.type] ?? entry.type}
            </span>
            <span className="text-sm text-muted">
              {Math.round((entry.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
