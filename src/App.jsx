import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Fixture from './pages/Fixture'
import Tabla from './pages/Tabla'
import MisApuestas from './pages/MisApuestas'
import Billetera from './pages/Billetera'
import Admin from './pages/Admin'
import './index.css'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/fixture" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/fixture" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/fixture" /> : <Register />} />
      <Route path="/fixture" element={<PrivateRoute><Fixture /></PrivateRoute>} />
      <Route path="/tabla" element={<PrivateRoute><Tabla /></PrivateRoute>} />
      <Route path="/mis-apuestas" element={<PrivateRoute><MisApuestas /></PrivateRoute>} />
      <Route path="/billetera" element={<PrivateRoute><Billetera /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
