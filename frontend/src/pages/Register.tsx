import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  // Prevent page from going blank on unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      // If it's a 422 validation error, prevent default handling
      if (event.reason?.response?.status === 422) {
        event.preventDefault()
        // Format and display the error
        const detail = event.reason.response?.data?.detail
        if (Array.isArray(detail)) {
          const errorMessages = detail.map((errorItem: any) => {
            const loc = errorItem.loc || []
            const fieldName = loc.filter((item: string) => item !== 'body').pop() || 'field'
            let msg = errorItem.msg || 'Invalid value'
            msg = msg.replace(/^Value error,\s*/i, '').trim()
            const displayFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            return `${displayFieldName}: ${msg}`
          })
          setError(errorMessages.join('. '))
        }
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.companyName || undefined
      )
      navigate('/dashboard')
    } catch (err: any) {
      // Handle different error formats
      let errorMessage = 'Failed to register'
      
      if (err.message) {
        // Error message from AuthContext (already formatted)
        errorMessage = err.message
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (Array.isArray(detail)) {
          // Multiple validation errors
          const errorMessages = detail.map((errorItem: any) => {
            // Extract field name from location array (skip 'body' if present)
            const loc = errorItem.loc || []
            const fieldName = loc.filter((item: string) => item !== 'body').pop() || 'field'
            
            // Clean up error message (remove "Value error," prefix if present)
            let msg = errorItem.msg || 'Invalid value'
            msg = msg.replace(/^Value error,\s*/i, '').trim()
            
            // Capitalize field name for display
            const displayFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            
            return `${displayFieldName}: ${msg}`
          })
          errorMessage = errorMessages.join('. ')
        } else if (typeof detail === 'string') {
          errorMessage = detail
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      setError(errorMessage)
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <AuthLayout
      title="Register"
      subtitle="Create your account"
      description="Join TMS today and start managing your travel services efficiently. Get access to the best travel management system for your business."
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm" role="alert">
            <strong className="font-semibold">Error: </strong>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="email@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Your Company"
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'SIGN UP'}
        </button>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            Sign In Now!
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default Register

