import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import styles from './Auth.module.css'

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    setLoading(true)
    try {
      await register(email, password, username)
      navigate('/fixture')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Ese email ya está registrado')
      else setError('Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await loginWithGoogle()
      navigate('/fixture')
    } catch {
      setError('Error al registrarse con Google')
    }
  }

  return (
    <div>
      <Navbar />
      <div className={styles.wrap}>
        <h2 className="bebas" style={{fontSize:'30px',marginBottom:'4px'}}>Crear cuenta</h2>
        <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'24px'}}>Registrate gratis y empezá a pronosticar</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Nombre de usuario</label>
            <input type="text" placeholder="crack_del_prode" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="divider">o</div>

        <button className={styles.googleBtn} onClick={handleGoogle}>
          <span>🔵</span> Continuar con Google
        </button>

        <p className={styles.toggle}>
          ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
        </p>
      </div>
    </div>
  )
}
