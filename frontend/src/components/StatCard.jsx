export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  icon: 'bg-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-600',  icon: 'bg-slate-100' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.positive ? 'text-green-600' : 'text-red-500'}`}>
              {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
            <Icon size={20} className={c.text} />
          </div>
        )}
      </div>
    </div>
  )
}
