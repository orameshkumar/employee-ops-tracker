import { fmtDate } from '../../utils/dateUtils'

// Shows DD MMM YYYY visually; transparent native date input handles picking.
export default function DateInput({ value, onChange, style, placeholder = 'DD MMM YYYY' }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <input
        type="text"
        readOnly
        value={value ? fmtDate(value) : ''}
        placeholder={placeholder}
        style={{ ...style, cursor: 'pointer', userSelect: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 2, border: 'none', padding: 0, margin: 0,
        }}
      />
    </div>
  )
}
