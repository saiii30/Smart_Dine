import { useTheme } from '../../contexts/ThemeContext'

interface BillingInputProps {
  type?: string
  placeholder?: string
  value: string
  disabled?: boolean
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
}

const BillingInput = ({
  type = 'text',
  placeholder,
  value,
  disabled = false,
  onChange
}: BillingInputProps) => {
  const { theme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={onChange}
      className={`w-full border rounded-lg px-3 py-2 ${
        isDark
          ? disabled
            ? 'bg-gray-700 border-gray-600 text-gray-300'
            : 'bg-gray-800 border-gray-600 text-white'
          : disabled
          ? 'bg-gray-50 border-gray-300 text-gray-900'
          : 'bg-white border-gray-300 text-gray-900'
      }`}
    />
  )
}

export default BillingInput