function HivePanel({ children, className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag className={`hive-chamber hive-chamber-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  )
}

export default HivePanel
