import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, onSnapshot, query, orderBy, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import styles from './Fixture.module.css'

export default function Fixture() {
  const { user, userData, refreshUserData } = useAuth()
  const navigate = useNavigate()
  const [partidos, setPartidos] = useState([])
  const [selOdd, setSelOdd] = useState({}) // partidoId -> { equipo, cuota }
  const [modal, setModal] = useState(null) // { partido, equipo, cuota }
  const [monto, setMonto] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'partidos'), orderBy('fecha', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setPartidos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const handleSelectOdd = (partidoId, equipo, cuota) => {
    setSelOdd(prev => ({
      ...prev,
      [partidoId]: prev[partidoId]?.equipo === equipo ? null : { equipo, cuota }
    }))
  }

  const openModal = (partido) => {
    if (!user) return navigate('/login')
    const sel = selOdd[partido.id]
    if (!sel) return
    setMonto(1000)
    setModal({ partido, ...sel })
  }

  const confirmarApuesta = async () => {
    if (!modal || !user) return
    if (monto < 100) return setMsg('El monto mínimo es $100')
    if (monto > (userData?.saldo || 0)) return setMsg('Saldo insuficiente')
    setLoading(true)
    setMsg('')
    try {
      const userRef = doc(db, 'users', user.uid)
      const apuestaRef = doc(collection(db, 'apuestas'))
      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef)
        const saldoActual = userSnap.data().saldo
        if (saldoActual < monto) throw new Error('Saldo insuficiente')
        tx.update(userRef, { saldo: saldoActual - monto })
        tx.set(apuestaRef, {
          userId: user.uid,
          username: userData.username,
          partidoId: modal.partido.id,
          partidoNombre: `${modal.partido.localName} vs ${modal.partido.visitanteName}`,
          equipo: modal.equipo,
          cuota: modal.cuota,
          monto,
          ganancia: parseFloat((monto * modal.cuota).toFixed(0)),
          estado: 'pendiente',
          createdAt: serverTimestamp()
        })
      })
      await refreshUserData()
      setModal(null)
      setSelOdd(prev => ({ ...prev, [modal.partido.id]: null }))
      setMsg('✓ Apuesta realizada')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(e.message || 'Error al procesar la apuesta')
    } finally {
      setLoading(false)
    }
  }

  const live = partidos.filter(p => p.estado === 'live')
  const proximos = partidos.filter(p => p.estado === 'proximo')
  const finalizados = partidos.filter(p => p.estado === 'finalizado').slice(-3)

  return (
    <div className="page">
      <Navbar />

      {msg && <div className={styles.toast} style={{background: msg.startsWith('✓') ? 'var(--green-dim)' : 'var(--red-dim)', color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)'}}>{msg}</div>}

      {live.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title">En vivo</div>
            <span className="badge badge-live">● LIVE</span>
          </div>
          {live.map(p => <PartidoCard key={p.id} partido={p} sel={selOdd[p.id]} onOdd={handleSelectOdd} onApostar={() => openModal(p)} isLive />)}
        </div>
      )}

      {proximos.length > 0 && (
        <div className="section" style={{paddingTop: live.length ? '8px' : '16px'}}>
          <div className="section-header">
            <div className="section-title">Próximos</div>
            <span className="badge badge-open">Apostar</span>
          </div>
          {proximos.map(p => <PartidoCard key={p.id} partido={p} sel={selOdd[p.id]} onOdd={handleSelectOdd} onApostar={() => openModal(p)} />)}
        </div>
      )}

      {finalizados.length > 0 && (
        <div className="section" style={{paddingTop:'8px',paddingBottom:'16px'}}>
          <div className="section-header">
            <div className="section-title">Finalizados</div>
          </div>
          {finalizados.map(p => <PartidoCard key={p.id} partido={p} sel={null} onOdd={() => {}} onApostar={() => {}} finalizado />)}
        </div>
      )}

      {partidos.length === 0 && (
        <div className={styles.empty}>
          <span style={{fontSize:'40px'}}>⚽</span>
          <p>Los partidos se cargan pronto</p>
        </div>
      )}

      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className="bebas" style={{fontSize:'22px'}}>Hacer apuesta</h3>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <div className={styles.modalSub}>{modal.partido.localName} vs {modal.partido.visitanteName} · {modal.equipo}</div>
            <div className={styles.saldoRow}>
              <div><div className={styles.saldoLabel}>Tu saldo</div><div className={styles.saldoVal}>${(userData?.saldo||0).toLocaleString('es-AR')}</div></div>
              <div style={{textAlign:'right'}}><div className={styles.saldoLabel}>Cuota</div><div className={styles.saldoVal}>x{modal.cuota.toFixed(2)}</div></div>
            </div>
            <div className={styles.chips}>
              {[500,1000,2000,5000].map(v => (
                <button key={v} className={`${styles.chip} ${monto===v?styles.chipSel:''}`} onClick={() => setMonto(v)}>${v.toLocaleString('es-AR')}</button>
              ))}
            </div>
            <input className={styles.montoInput} type="number" value={monto} onChange={e => setMonto(parseInt(e.target.value)||0)} min="100" />
            <div className={styles.ganRow}>
              <span style={{color:'var(--muted)',fontSize:'13px'}}>Ganancia potencial</span>
              <span style={{color:'var(--green)',fontWeight:500}}>${Math.round(monto*(modal.cuota||1)).toLocaleString('es-AR')}</span>
            </div>
            {msg && <div style={{color:'var(--red)',fontSize:'12px',marginBottom:'10px'}}>{msg}</div>}
            <button className="btn btn-primary btn-block" onClick={confirmarApuesta} disabled={loading}>
              {loading ? 'Procesando...' : 'Confirmar apuesta →'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function PartidoCard({ partido, sel, onOdd, onApostar, isLive, finalizado }) {
  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.meta}>
        <span style={{fontSize:'11px',color:'var(--muted)'}}>{partido.hora} · {partido.fase}</span>
        {isLive && <span className="badge badge-live">● En vivo</span>}
        {!isLive && !finalizado && <span className="badge badge-open">Abiertas</span>}
        {finalizado && <span className="badge badge-closed">Finalizado</span>}
      </div>
      <div className={styles.teams}>
        <div className={styles.team}>
          <span className={styles.flag}>{partido.local}</span>
          <span>{partido.localName}</span>
        </div>
        {(isLive || finalizado) && partido.marcador ? (
          <div className={styles.score}>
            <div className={styles.scoreNum}>{partido.marcador}</div>
            {isLive && <div style={{fontSize:'10px',color:'var(--red)'}}>● {partido.minuto}'</div>}
          </div>
        ) : (
          <div className={`${styles.vs} bebas`}>VS</div>
        )}
        <div className={`${styles.team} ${styles.teamR}`}>
          <span className={styles.flag}>{partido.visitante}</span>
          <span>{partido.visitanteName}</span>
        </div>
      </div>
      {!finalizado && !isLive && (
        <>
          <div className={styles.odds}>
            {[
              {label: `${partido.localName} gana`, equipo: partido.localName, cuota: partido.cuotaLocal},
              {label: 'Empate', equipo: 'Empate', cuota: partido.cuotaEmpate},
              {label: `${partido.visitanteName} gana`, equipo: partido.visitanteName, cuota: partido.cuotaVisitante},
            ].map(o => (
              <button
                key={o.equipo}
                className={`${styles.oddBtn} ${sel?.equipo === o.equipo ? styles.oddSel : ''}`}
                onClick={() => onOdd(partido.id, o.equipo, o.cuota)}
              >
                <span className={styles.oddLabel}>{o.label}</span>
                <span className={styles.oddVal}>x{o.cuota?.toFixed(2)}</span>
              </button>
            ))}
          </div>
          {sel && (
            <button className="btn btn-primary btn-block" style={{marginTop:'10px',fontSize:'13px'}} onClick={onApostar}>
              Apostar → {sel.equipo} (x{sel.cuota?.toFixed(2)})
            </button>
          )}
        </>
      )}
    </div>
  )
}
