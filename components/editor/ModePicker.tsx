'use client'

export type Mode = 'general' | 'ocp' | 'arabic_rewrite'

const modes: { value: Mode; label: string }[] = [
  { value: 'general', label: 'General Redouane Style' },
  { value: 'ocp', label: 'OCP Style' },
  { value: 'arabic_rewrite', label: 'Arabic Rewrite' },
]

interface Props {
  value: Mode
  onChange: (mode: Mode) => void
}

export default function ModePicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      {modes.map(mode => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            value === mode.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
