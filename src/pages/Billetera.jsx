import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import styles from './Billetera.module.css'

const CBU = 'TU_CBU_AQUI'
const ALIAS = 'worldcup.prode'

export default function Billetera() {
  const { user, userData } = useAuth()
  const [movimientos, setMovimientos] = useState([])
  const [view, setView] = useState('main') // main | depositar | retirar
  const [monto, setMonto] = useState('')
  const [cbu, setCbu] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'movimientos'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const solicitarDeposito = async () => {
    if (!monto || parseInt(monto) < 500) return setMsg('El monto mínimo es $500')
    setLoading(true)
    try {
      await addDoc(collection(db, 'solicitudes'), {
        userId: user.uid,
        username: userData.username,
        tipo: 'deposito',
        monto: parseInt(monto),
        estado: 'pendiente',
        createdAt: serverTimestamp()
      })
      setMsg('✓ Solicitud enviada. Transferí $' + parseInt(monto).toLocaleString('es-AR') + ' al CBU/alias y el admin acreditará tu saldo.')
      setMonto('')
      setView('main')
    } catch {
      setMsg('Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const solicitarRetiro = async () => {
    if (!monto || parseInt(monto) < 500) return setMsg('El monto mínimo es $500')
    if (parseInt(monto) > (userData?.saldo || 0)) return setMsg('Saldo insuficiente')
    if (!cbu) return setMsg('Ingresá tu CBU o alias')
    setLoading(true)
    try {
      await addDoc(collection(db, 'solicitudes'), {
        userId: user.uid,
        username: userData.username,
        tipo: 'retiro',
        monto: parseInt(monto),
        cbu,
        estado: 'pendiente',
        createdAt: serverTimestamp()
      })
      setMsg('✓ Solicitud de retiro enviada. El admin procesará la transferencia en las próximas horas.')
      setMonto('')
      setCbu('')
      setView('main')
    } catch {
      setMsg('Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <Navbar />
      <div className="section">
        <div className="section-title" style={{marginBottom:'16px'}}>Mi billetera</div>

        {msg && (
          <div className={styles.msg} style={{background: msg.startsWith('✓') ? 'var(--green-dim)' : 'var(--red-dim)', color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)', borderColor: msg.startsWith('✓') ? 'var(--green-border)' : 'rgba(255,71,87,0.25)'}}>
            {msg}
            <button onClick={() => setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer',marginLeft:'8px'}}>✕</button>
          </div>
        )}

        <div className={styles.saldoCard}>
          <div className={styles.saldoLabel}>Saldo disponible</div>
          <div className={`${styles.saldoNum} bebas`}>${(userData?.saldo||0).toLocaleString('es-AR')}</div>
          <div className={styles.saldoCurrency}>ARS</div>
        </div>

        {view === 'main' && (
          <>
            <div className={styles.actions}>
              <button className="btn btn-primary" onClick={() => setView('depositar')}>
                ＋ Depositar
              </button>
              <button className="btn btn-outline" onClick={() => setView('retirar')}>
                ↑ Retirar
              </button>
            </div>

            <div className="section-title" style={{fontSize:'16px',marginBottom:'12px'}}>Últimos movimientos</div>
            {movimientos.length === 0 && (
              <div style={{textAlign:'center',padding:'30px',color:'var(--muted)',fontSize:'14px'}}>Sin movimientos aún</div>
            )}
            {movimientos.map(m => (
              <div key={m.id} className={styles.mov}>
                <div>
                  <div className={styles.movLabel}>{m.descripcion || (m.tipo === 'deposito' ? 'Depósito' : m.tipo === 'retiro' ? 'Retiro' : 'Apuesta')}</div>
                  <div className={styles.movSub}>{m.createdAt?.toDate?.()?.toLocaleString('es-AR') || '–'}</div>
                </div>
                <span style={{fontWeight:500, color: m.monto > 0 ? 'var(--green)' : 'var(--red)'}}>
                  {m.monto > 0 ? '+' : ''}${Math.abs(m.monto).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </>
        )}

        {view === 'depositar' && (
          <div className={styles.formCard}>
            <h3 className="bebas" style={{fontSize:'20px',marginBottom:'4px'}}>Depositar saldo</h3>
            <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'16px'}}>
              Realizá una transferencia y tu saldo se acreditará en minutos.
            </p>
            <div className={styles.bankInfo}>
              <div className={styles.bankRow}><span className={styles.bankLabel}>Alias</span><span className={styles.bankVal}>{ALIAS}</span></div>
              <div className={styles.bankRow}><span className={styles.bankLabel}>CBU</span><span className={styles.bankVal} style={{fontSize:'12px'}}>{CBU}</span></div>
            </div>
            <div className="form-group">
              <label>Monto a depositar</label>
              <input type="number" placeholder="Ej: 5000" value={monto} onChange={e => setMonto(e.target.value)} min="500" />
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-outline" onClick={() => setView('main')} style={{flex:1}}>Cancelar</button>
              <button className="btn btn-primary" onClick={solicitarDeposito} disabled={loading} style={{flex:1}}>
                {loading ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {view === 'retirar' && (
          <div className={styles.formCard}>
            <h3 className="bebas" style={{fontSize:'20px',marginBottom:'4px'}}>Retirar saldo</h3>
            <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'16px'}}>
              Procesamos retiros en horario comercial. Máx 24hs hábiles.
            </p>
            <div className="form-group">
              <label>Monto a retirar</label>
              <input type="number" placeholder="Ej: 3000" value={monto} onChange={e => setMonto(e.target.value)} min="500" />
            </div>
            <div className="form-group">
              <label>Tu CBU o Alias</label>
              <input type="text" placeholder="alias.de.tu.cuenta" value={cbu} onChange={e => setCbu(e.target.value)} />
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-outline" onClick={() => setView('main')} style={{flex:1}}>Cancelar</button>
              <button className="btn btn-primary" onClick={solicitarRetiro} disabled={loading} style={{flex:1}}>
                {loading ? '...' : 'Solicitar retiro'}
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
