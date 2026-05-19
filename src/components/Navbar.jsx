import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, userData, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const initials = (userData?.username || user?.displayName || 'U').slice(0, 2).toUpperCase()

  return (
    <nav className={styles.nav}>
      <div className={styles.logo} onClick={() => navigate(user ? '/fixture' : '/')}>
        ⚽ WORLD CUP JOURNEY
      </div>
      {user ? (
        <div className={styles.right}>
          <span className={styles.saldo}>
            ${(userData?.saldo || 0).toLocaleString('es-AR')}
          </span>
          <div className={styles.avatarWrap} onClick={handleLogout} title="Cerrar sesión">
            <div className="avatar">{initials}</div>
          </div>
        </div>
      ) : (
        <div className={styles.right}>
          <button className="btn btn-outline" style={{padding:'7px 14px',fontSize:'13px'}} onClick={() => navigate('/login')}>Ingresar</button>
          <button className="btn btn-primary" style={{padding:'7px 14px',fontSize:'13px'}} onClick={() => navigate('/register')}>Registrarse</button>
        </div>
      )}
    </nav>
  )
}
