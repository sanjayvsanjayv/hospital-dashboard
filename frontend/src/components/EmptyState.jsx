import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'No data', message = 'Nothing to show here yet.', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon size={24} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400">{message}</p>
    </div>
  )
}
