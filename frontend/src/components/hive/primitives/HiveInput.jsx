function HiveInput({ label, hint, as = 'input', className = '', children, ...props }) {
  const isTextarea = as === 'textarea'
  const isSelect = as === 'select'

  return (
    <label className="block">
      {label ? <span className="hive-field-label">{label}</span> : null}
      {isSelect ? (
        <select className={`hive-field-input ${className}`.trim()} {...props}>{children}</select>
      ) : isTextarea ? (
        <textarea className={`hive-field-input resize-none ${className}`.trim()} {...props} />
      ) : (
        <input className={`hive-field-input ${className}`.trim()} {...props} />
      )}
      {hint ? <span className="hive-field-hint">{hint}</span> : null}
    </label>
  )
}

export default HiveInput
