import { useTheme } from '../../contexts/ThemeContext'

interface BillingSelectProps {
  value: string
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void
  options: {
    label: string
    value: string
  }[]
  placeholder: string
}

const BillingSelect = ({
  value,
  onChange,
  options,
  placeholder
}: BillingSelectProps) => {
  const { theme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full border rounded-lg px-3 py-2 ${
        isDark
          ? 'bg-gray-800 border-gray-600 text-white'
          : 'bg-white border-gray-300 text-gray-900'
      }`}
    >
      <option value="">
        {placeholder}
      </option>

      {options.map((option, index) => (
        <option
          key={index}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default BillingSelect