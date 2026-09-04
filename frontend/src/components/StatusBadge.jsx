const STATUS_MAP = {
  admitted:           { bg: 'bg-blue-100',   text: 'text-blue-800'   },
  discharged:         { bg: 'bg-slate-100',  text: 'text-slate-600'  },
  transferred:        { bg: 'bg-purple-100', text: 'text-purple-800' },
  pending:            { bg: 'bg-amber-100',  text: 'text-amber-800'  },
  completed:          { bg: 'bg-green-100',  text: 'text-green-800'  },
  report_ready:       { bg: 'bg-teal-100',   text: 'text-teal-800'   },
  specimen_collected: { bg: 'bg-cyan-100',   text: 'text-cyan-800'   },
  scan_started:       { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  doctor_reviewed:    { bg: 'bg-green-100',  text: 'text-green-800'  },
  specialist_pending: { bg: 'bg-red-100',    text: 'text-red-800'    },
  active:             { bg: 'bg-red-100',    text: 'text-red-800'    },
  acknowledged:       { bg: 'bg-blue-100',   text: 'text-blue-800'   },
  escalated:          { bg: 'bg-orange-100', text: 'text-orange-800' },
  resolved:           { bg: 'bg-green-100',  text: 'text-green-800'  },
  false_positive:     { bg: 'bg-slate-100',  text: 'text-slate-600'  },
  open:               { bg: 'bg-red-100',    text: 'text-red-800'    },
  blocked:            { bg: 'bg-red-100',    text: 'text-red-800'    },
}

export default function StatusBadge({ status, className = '' }) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_')
  const cfg = STATUS_MAP[key] || { bg: 'bg-slate-100', text: 'text-slate-600' }
  const label = (status || '—').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5 ${cfg.bg} ${cfg.text} ${className}`}>
      {label}
    </span>
  )
}
