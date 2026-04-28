import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

const Register = () => {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [agencies, setAgencies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    password: '',
    parentId: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* -------- Fetch agencies for dropdown -------- */
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/auth/agencies`)
      .then(res => setAgencies(res.data))
      .catch(() => setError('Failed to load agencies'))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })

    if(e.target.name === "parentId"){
      localStorage.setItem("selectedAgencyId", e.target.value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(
        formData.fullName,
        formData.email,
        formData.password,
        formData.contactNumber,
        formData.parentId
      )
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Register"
      subtitle="Create your account"
      description="Join TMS today and manage your travel services efficiently."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
        )}

        {/* Agency Dropdown */}
        <select
          name="parentId"
          value={formData.parentId}
          onChange={handleChange}
          required
          className="w-full p-3 border rounded"
        >
          <option value="">Select Agency</option>
          {agencies.map(a => (
            <option key={a.id} value={a.id}>
              {a.agency_name}
            </option>
          ))}
        </select>

        <input
          name="fullName"
          placeholder="Full Name"
          required
          className="w-full p-3 border rounded"
          value={formData.fullName}
          onChange={handleChange}
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full p-3 border rounded"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          name="contactNumber"
          type="tel"
          maxLength={10}
          placeholder="Phone Number (10 digits)"
          required
          className="w-full p-3 border rounded"
          value={formData.contactNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            setFormData({ ...formData, contactNumber: value })
          }}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full p-3 border rounded"
          value={formData.password}
          onChange={handleChange}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white p-3 rounded"
        >
          {loading ? 'Creating account...' : 'SIGN UP'}
        </button>

        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 font-semibold">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register
