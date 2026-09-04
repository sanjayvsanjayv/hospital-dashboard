import { AlertTriangle } from 'lucide-react'

export default function ErrorMessage({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle size={24} className="text-red-500" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  )
}
