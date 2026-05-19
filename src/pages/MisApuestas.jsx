import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import styles from './MisApuestas.module.css'

export default function MisApuestas() {
  const { user } = useAuth()
  const [apuestas, setApuestas] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'apuestas'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setApuestas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const total = apuestas.reduce((s, a) => s + a.monto, 0)
  const ganado = apuestas.filter(a => a.estado === 'ganada').reduce((s, a) => s + a.ganancia, 0)
  const pendiente = apuestas.filter(a => a.estado === 'pendiente').length

  return (
    <div className="page">
      <Navbar />
      <div className="section">
        <div className="section-header">
          <div className="section-title">Mis apuestas</div>
          <span className="badge badge-open">{apuestas.length} total</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statL}>Apostado</div>
            <div className={styles.statN}>${total.toLocaleString('es-AR')}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statL}>Cobrado</div>
            <div className={styles.statN} style={{color:'var(--green)'}}>${ganado.toLocaleString('es-AR')}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statL}>Pendientes</div>
            <div className={styles.statN}>{pendiente}</div>
          </div>
        </div>

        {apuestas.length === 0 && (
          <div className={styles.empty}>
            <span style={{fontSize:'40px'}}>🎫</span>
            <p>Aún no hiciste ninguna apuesta</p>
          </div>
        )}

        {apuestas.map(a => (
          <div key={a.id} className={`card ${styles.card}`}>
            <div className={styles.header}>
              <div>
                <div className={styles.partido}>{a.partidoNombre}</div>
                <div className={styles.pronostico}>Pronóstico: <strong>{a.equipo}</strong> · x{a.cuota?.toFixed(2)}</div>
              </div>
              {a.estado === 'pendiente' && <span className="badge badge-open">⏳ Pendiente</span>}
              {a.estado === 'ganada' && <span className="badge badge-win">✓ Ganaste</span>}
              {a.estado === 'perdida' && <span className="badge badge-loss">✗ Perdiste</span>}
              {a.estado === 'live' && <span className="badge badge-live">● Live</span>}
            </div>
            <div className={styles.montos}>
              <div>
                <div className={styles.montoLabel}>Apostado</div>
                <div className={styles.montoVal} style={{color: a.estado==='perdida' ? 'var(--red)' : 'var(--text)'}}>
                  {a.estado==='perdida' ? '-' : ''}${a.monto.toLocaleString('es-AR')}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className={styles.montoLabel}>{a.estado === 'ganada' ? 'Cobrado' : 'Ganancia potencial'}</div>
                <div className={styles.montoVal} style={{color:'var(--green)'}}>
                  ${a.ganancia?.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
