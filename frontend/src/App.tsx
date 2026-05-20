import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider } from './contexts/SettingsContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import Dashboard from './pages/Dashboard'
import Tables from './pages/Tables'
import MenuPage from './pages/MenuPage'
import MenuScheduler from './pages/MenuScheduler'
import OrdersPage from './pages/OrdersPage'
import Kitchen from './pages/Kitchen'
import Billing from './pages/Billing'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Employees from './pages/Employees'
import Customer from './pages/Customer'

const DefaultRoute = () => {
  const { user } = useAuth()
  if (user?.role === 'WAITER') return <Navigate to="/tables" replace />
  if (user?.role === 'KITCHEN') return <Navigate to="/kitchen" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/customer/:token" element={<Customer />} />
              
              <Route
                path="/"
                element={
                 
                    <Layout />
                
                }
              >
                <Route index element={<DefaultRoute />} />
                <Route 
                  path="dashboard" 
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'CASHIER']}>
                      <Dashboard />
                    </RoleRoute>
                  } 
                />
                <Route 
                  path="tables" 
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']}>
                      <Tables />
                    </RoleRoute>
                  } 
                />
                <Route 
                  path="menu" 
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']}>
                      <MenuPage />
                    </RoleRoute>
                  } 
                />
            <Route
              path="menu-scheduler"
              element={
                <RoleRoute roles={['ADMIN', 'MANAGER']}>
                  <MenuScheduler />
                </RoleRoute>
              }
            />
                <Route
                  path="orders"
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN']}>
                      <OrdersPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="kitchen"
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'KITCHEN']}>
                      <Kitchen />
                    </RoleRoute>
                  }
                />
                <Route
                  path="billing"
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'CASHIER']}>
                      <Billing />
                    </RoleRoute>
                  }
                />
                <Route 
                  path="inventory" 
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER']}>
                      <Inventory />
                    </RoleRoute>
                  } 
                />
                <Route
                  path="employees"
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER']}>
                      <Employees />
                    </RoleRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER', 'CASHIER']}>
                      <Reports />
                    </RoleRoute>
                  }
                />
                <Route 
                  path="settings" 
                  element={
                    <RoleRoute roles={['ADMIN', 'MANAGER']}>
                      <Settings />
                    </RoleRoute>
                  } 
                />
              </Route>
              <Route path="*" element={<DefaultRoute />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}

export default App
