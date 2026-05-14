'use client'

import { Copy, ClipboardPaste } from 'lucide-react'

interface Props {
  title: string
  value: string
  onChange?: (val: string) => void
  placeholder?: string
  readOnly?: boolean
  variant?: 'source' | 'result'
  maxLength?: number
}

export default function EditorPanel({
  title,
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  variant = 'source',
  maxLength = 5000,
}: Props) {
  function copyToClipboard() {
    navigator.clipboard.writeText(value)
  }

  async function pasteFromClipboard() {
    const text = await navigator.clipboard.readText()
    onChange?.(text)
  }

  const borderClass =
    variant === 'source'
      ? 'border-transparent ring-1 ring-transparent'
      : 'border-green-300/70'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-xs text-gray-400">{value.length} / {maxLength}</span>
      </div>

      <div
        className={`relative rounded-xl border overflow-hidden ${borderClass} ${
          variant === 'source'
            ? 'source-gradient-border'
            : ''
        }`}
        style={
          variant === 'source'
            ? {
                background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #7c3aed, #ec4899) border-box',
                border: '1.5px solid transparent',
              }
            : {}
        }
      >
        <textarea
          value={value}
          onChange={e => onChange?.(e.target.value.slice(0, maxLength))}
          readOnly={readOnly}
          placeholder={placeholder}
          rows={7}
          dir={variant === 'result' ? 'rtl' : 'ltr'}
          className="w-full resize-none bg-white px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-300 focus:outline-none leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={copyToClipboard}
          disabled={!value}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition disabled:opacity-30"
          title="Copier"
        >
          <Copy size={16} />
        </button>
        {!readOnly && (
          <button
            onClick={pasteFromClipboard}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            title="Coller"
          >
            <ClipboardPaste size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
