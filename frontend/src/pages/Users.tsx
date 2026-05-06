import { useState, useMemo } from 'react'
import {  Trash2, User, Search } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/api'
import Swal from 'sweetalert2'

export interface AppUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'DRIVER' | "IT_COMPANY" | string
  company_name: string
}

const Users = () => {
  const [users, setUsers] = useState<AppUser[]>([
    
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const { user: loggedInUser } = useAuth()

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

useEffect(() => {
  if (loggedInUser?.id) {
    fetchUsers()
  }
}, [loggedInUser?.id])


const fetchUsers = async () => {
  const startTime = Date.now()
  setLoading(true)

  try {
    const parentId = localStorage.getItem("selectedAgencyId")

    if (!parentId) {
      setLoading(false)   // ✅ IMPORTANT FIX
      return
    }

    const res = await api.get(`/users/${parentId}`)

    const filteredUsers = res.data.filter((u: AppUser) =>
      (loggedInUser ? u.id !== loggedInUser.id.toString() : true) &&
      (u.role === "ADMIN" || u.role === "SUPERVISOR")
    )

    setUsers(filteredUsers)
    showNotification('success', 'Users loaded successfully')

  } catch (err) {
    setError('Failed to load users')
    showNotification('error', 'Failed to load users')

  } finally {
    const elapsed = Date.now() - startTime
    const minLoadingTime = 300

    if (elapsed < minLoadingTime) {
      setTimeout(() => setLoading(false), minLoadingTime - elapsed)
    } else {
      setLoading(false)
    }
  }
}

  const [searchQuery, setSearchQuery] = useState('')

 const handleRoleChange = async (userId: string, newRole: string) => {
  setLoading(true)
  try {
    await api.put(
      `/users/${userId}/role`,
      { role: newRole }
    )
    showNotification('success', 'User role updated successfully')
  } catch (err) {
    console.error("Failed to update role:", err)
    setError('Failed to update user role')
    showNotification('error', 'Failed to update user role')
  } finally {
    setLoading(false)
  }

  setUsers(prev =>
    prev.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    )
  )
}



  const filteredUsers = useMemo(() => {
  const q = searchQuery.toLowerCase().trim()

  return users.filter(u =>
    `${u.name} ${u.email} ${u.role} ${u.company_name}`
      .toLowerCase()
      .includes(q)
  )
}, [users, searchQuery])

  const handleDelete = async (id: string) => {
  const result = await Swal.fire({
    title: 'Delete User',
    text: 'Are you sure you want to delete this user? This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  })

  if (!result.isConfirmed) return

  setLoading(true)
  try {
    await api.delete(`/users/${id}`)
    await fetchUsers()   // 🔥 IMPORTANT
    showNotification('success', 'User deleted successfully')
    
    await Swal.fire({
      title: 'Deleted!',
      text: 'User has been deleted successfully.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    })
  } catch (err) {
    console.error("Failed to delete user:", err)
    setError('Failed to delete user')
    showNotification('error', 'Failed to delete user')
    
    await Swal.fire({
      title: 'Error',
      text: 'Failed to delete user. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    })
  } finally {
    setLoading(false)
  }
}

  if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
            </div>
        )
    }
  

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
        <div className="flex flex-1 md:max-w-lg items-center gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
         
        </div>
      </div>

      {/* USERS GRID */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() ? 'No users found' : 'No users'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery.trim() ? 'Try adjusting your search criteria.' : 'Get started by adding your first user.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 cursor-pointer" >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{user.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  {/* ROLE SWITCH */}
<div className="mt-3 flex items-center justify-between">
  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
    Role:
  </span>

  <select
    value={user.role}
    onChange={(e) => handleRoleChange(user.id, e.target.value)}
    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
  >
    <option value="ADMIN">ADMIN</option>
    <option value="SUPERVISOR">SUPERVISOR</option>
  </select>
</div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{user.company_name}</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                
                <button
                  onClick={() => handleDelete(user.id)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Users
