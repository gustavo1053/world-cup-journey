import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import styles from './Tabla.module.css'

export default function Tabla() {
  const { user } = useAuth()
  const [jugadores, setJugadores] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('puntos', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setJugadores(snap.docs.map((d, i) => ({ ...d.data(), pos: i + 1 })))
    })
    return unsub
  }, [])

  const medalEmoji = (pos) => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos

  return (
    <div className="page">
      <Navbar />
      <div className="section">
        <div className="section-header">
          <div className="section-title">Tabla de posiciones</div>
          <span className="badge badge-open">{jugadores.length} jugadores</span>
        </div>

        <div className={styles.tableWrap}>
          <div className={styles.thead}>
            <span>#</span>
            <span style={{flex:1}}>Jugador</span>
            <span>Aciertos</span>
            <span>Pts</span>
          </div>
          {jugadores.map(j => (
            <div key={j.uid} className={`${styles.row} ${j.uid === user?.uid ? styles.meRow : ''}`}>
              <span className={styles.pos}>{medalEmoji(j.pos)}</span>
              <div className={styles.userCell}>
                <div className={`avatar ${styles.av}`} style={j.uid === user?.uid ? {} : {background:'var(--border)',color:'var(--text)'}}>
                  {(j.username||'?').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className={styles.uname}>
                    {j.username}
                    {j.uid === user?.uid && <span className={styles.youTag}>vos</span>}
                  </div>
                  <div className={styles.usub}>{j.totalApuestas || 0} apuestas</div>
                </div>
              </div>
              <span className={styles.aciertos}>{j.aciertos || 0}</span>
              <span className={`${styles.pts} bebas`}>{j.puntos || 0}</span>
            </div>
          ))}
          {jugadores.length === 0 && (
            <div style={{textAlign:'center',padding:'40px',color:'var(--muted)',fontSize:'14px'}}>
              Aún no hay jugadores registrados
            </div>
          )}
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}><span className="badge badge-open">3 pts</span> Resultado exacto</div>
          <div className={styles.legendItem}><span className="badge badge-closed">1 pt</span> Ganador correcto</div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
