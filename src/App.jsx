import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './components/auth/Login'
import EmployeeHome from './pages/EmployeeHome'
import ManagerHome from './pages/ManagerHome'

function PrivateRoute({ children, role }) {
  const { user, profile } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />
  return children
}

function RootRedirect() {
  const { user, profile } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'manager') return <Navigate to="/manager" replace />
  return <Navigate to="/employee" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/employee/*" element={
          <PrivateRoute><EmployeeHome /></PrivateRoute>
        } />
        <Route path="/manager/*" element={
          <PrivateRoute role="manager"><ManagerHome /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
