import { useLocation, useNavigate } from 'react-router-dom'
import styles from './BottomNav.module.css'

const tabs = [
  { path: '/fixture', label: 'Fixture', icon: '📅' },
  { path: '/tabla', label: 'Tabla', icon: '🏆' },
  { path: '/mis-apuestas', label: 'Apuestas', icon: '🎫' },
  { path: '/billetera', label: 'Billetera', icon: '💰' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className={styles.nav}>
      {tabs.map(t => (
        <button
          key={t.path}
          className={`${styles.item} ${pathname === t.path ? styles.active : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span className={styles.icon}>{t.icon}</span>
          <span className={styles.label}>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
