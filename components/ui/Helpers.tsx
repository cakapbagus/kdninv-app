import { STATUS_LABELS } from '@/lib/constants';

export function StatusBadge({ status }: { status: string }) {
  const cls = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    finished: 'badge-finished',
  }[status] || 'badge-pending'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function Field({ label, type = 'text', req = false, placeholder = '', value, numberOnly = false, alphaOnly = false, onChange }: {
  label: string; type?: string; req?: boolean; placeholder?: string; value: string
  numberOnly?: boolean; alphaOnly?: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (numberOnly) v = v.replace(/[^0-9]/g, '')
    if (alphaOnly)  v = v.replace(/[^a-zA-Z\s]/g, '')
    e.target.value = v
    onChange(e)
  }
  return (
    <div>
      <label className="label-field">{label} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>
      <input type={type} value={value} onChange={handleChange} className="input-field" placeholder={placeholder}
        required={req} inputMode={numberOnly ? 'numeric' : undefined} />
    </div>
  )
}
