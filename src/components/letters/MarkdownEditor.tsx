interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export const MarkdownEditor = ({ value, onChange }: MarkdownEditorProps) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Результат распознавания появится здесь..."
      style={{
        width: '100%',
        height: '60vh',
        fontFamily: 'monospace',
        fontSize: '13px',
        padding: '12px',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        resize: 'none'
      }}
    />
  )
}

