import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'

const ForgotPassword = () => (
  <AuthLayout title="Reset access" subtitle="Contact your Smart Dine administrator">
    <p className="text-sm text-slate-600 dark:text-slate-300">
      Password self-service can be wired to your email provider (SMTP). For this demo stack, ask an{' '}
      <code className="text-xs bg-black/5 px-1 rounded">ADMIN</code> user to reset staff accounts from the database
      or re-register with a new email.
    </p>
    <Link to="/login" className="inline-block mt-6 text-amber-600 font-medium">
      Back to login
    </Link>
  </AuthLayout>
)

export default ForgotPassword
