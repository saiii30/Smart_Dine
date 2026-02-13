import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider } from './contexts/SettingsContext.tsx'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Drivers from './pages/Drivers'
import Trips from './pages/Trips'
import Notifications from './pages/Notifications.tsx'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Users from './pages/Users'
import PricingSection from './pages/PricesSection'
import ITCompanyDashboard from './pages/ITCompanyDashboard'
import Settings from './pages/Settings.tsx'


function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
         
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="trips" element={<Trips />} />
               <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                <Route path="users" element={<Users />} />
              <Route path="prices" element={<PricingSection />} />
               <Route path="/ITCompanyDashboard" element={<ITCompanyDashboard />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
   </SettingsProvider>
</ThemeProvider>
  )
}

export default App

