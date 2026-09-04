export default function RiskBadge({ level, confidence, size = 'sm' }) {
  const cfg = {
    HIGH:   { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
    MEDIUM: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
    LOW:    { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
  }
  const c = cfg[level] || cfg.LOW
  const sz = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${c.bg} ${c.text} ${c.border} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {level}
      {confidence != null && <span className="opacity-70 font-normal">({confidence}%)</span>}
    </span>
  )
}
