import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy, runTransaction } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { importWorldCupFixtures } from '../utils/importFixtures'
import styles from './Admin.module.css'

// UIDs de admins — reemplazá con tu UID de Firebase
const ADMIN_UIDS = ['7f180sm2uEYfKVzg16VpobXnPhq1']

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('partidos')
  const [partidos, setPartidos] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [apuestas, setApuestas] = useState([])
  const [newPartido, setNewPartido] = useState({ local:'', localName:'', visitante:'', visitanteName:'', hora:'', fase:'', cuotaLocal:2.0, cuotaEmpate:3.2, cuotaVisitante:2.5, apiFixtureId:'' })
  const [msg, setMsg] = useState('')

  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const handleImport = async () => {
    setImporting(true)
    setImportMsg('Iniciando importación...')
    const result = await importWorldCupFixtures((msg) => setImportMsg(msg))
    if (result.success) {
      setMsg(`✓ ${result.count} partidos importados${result.demo ? ' (Mundial 2022 demo)' : ''}`)
    } else {
      setMsg('Error: ' + result.error)
    }
    setImportMsg('')
    setImporting(false)
  }

  useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db,'partidos'), orderBy('fecha','asc')), snap => setPartidos(snap.docs.map(d=>({id:d.id,...d.data()}))))
    const unsub2 = onSnapshot(query(collection(db,'solicitudes'), orderBy('createdAt','desc')), snap => setSolicitudes(snap.docs.map(d=>({id:d.id,...d.data()}))))
    const unsub3 = onSnapshot(query(collection(db,'apuestas'), orderBy('createdAt','desc')), snap => setApuestas(snap.docs.map(d=>({id:d.id,...d.data()}))))
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  const agregarPartido = async () => {
    try {
      await addDoc(collection(db,'partidos'), {
        ...newPartido,
        cuotaLocal: parseFloat(newPartido.cuotaLocal),
        cuotaEmpate: parseFloat(newPartido.cuotaEmpate),
        cuotaVisitante: parseFloat(newPartido.cuotaVisitante),
        apiFixtureId: newPartido.apiFixtureId ? parseInt(newPartido.apiFixtureId) : null,
        estado: 'proximo',
        fecha: serverTimestamp()
      })
      setMsg('✓ Partido agregado')
      setNewPartido({local:'',localName:'',visitante:'',visitanteName:'',hora:'',fase:'',cuotaLocal:2.0,cuotaEmpate:3.2,cuotaVisitante:2.5,apiFixtureId:''})
    } catch { setMsg('Error al agregar partido') }
  }

  const cambiarEstado = async (id, estado, marcador = '') => {
    await updateDoc(doc(db,'partidos',id), { estado, ...(marcador && {marcador}) })
  }

  const resolverApuestas = async (partido, resultado) => {
    const apuestasPart = apuestas.filter(a => a.partidoId === partido.id && a.estado === 'pendiente')
    for (const a of apuestasPart) {
      const gano = a.equipo === resultado
      await runTransaction(db, async tx => {
        const apRef = doc(db,'apuestas',a.id)
        const userRef = doc(db,'users',a.userId)
        tx.update(apRef, { estado: gano ? 'ganada' : 'perdida' })
        if (gano) {
          const userSnap = await tx.get(userRef)
          const saldo = userSnap.data().saldo || 0
          const puntos = (userSnap.data().puntos || 0) + 3
          const aciertos = (userSnap.data().aciertos || 0) + 1
          tx.update(userRef, { saldo: saldo + a.ganancia, puntos, aciertos })
          await addDoc(collection(db,'movimientos'), {
            userId: a.userId, monto: a.ganancia,
            descripcion: `Ganancia: ${a.partidoNombre}`,
            createdAt: serverTimestamp()
          })
        }
      })
    }
    setMsg(`✓ ${apuestasPart.length} apuestas resueltas`)
  }

  const aprobarDeposito = async (sol) => {
    await runTransaction(db, async tx => {
      const userRef = doc(db,'users',sol.userId)
      const userSnap = await tx.get(userRef)
      const saldo = (userSnap.data().saldo || 0) + sol.monto
      tx.update(userRef, { saldo })
      tx.update(doc(db,'solicitudes',sol.id), { estado: 'aprobada' })
    })
    await addDoc(collection(db,'movimientos'), {
      userId: sol.userId, monto: sol.monto,
      descripcion: 'Depósito acreditado',
      createdAt: serverTimestamp()
    })
    setMsg('✓ Depósito acreditado')
  }

  const aprobarRetiro = async (sol) => {
    await runTransaction(db, async tx => {
      const userRef = doc(db,'users',sol.userId)
      const userSnap = await tx.get(userRef)
      const saldo = (userSnap.data().saldo || 0) - sol.monto
      if (saldo < 0) throw new Error('Saldo insuficiente')
      tx.update(userRef, { saldo })
      tx.update(doc(db,'solicitudes',sol.id), { estado: 'procesada' })
    })
    await addDoc(collection(db,'movimientos'), {
      userId: sol.userId, monto: -sol.monto,
      descripcion: 'Retiro procesado',
      createdAt: serverTimestamp()
    })
    setMsg('✓ Retiro procesado')
  }

  if (!isAdmin) return (
    <div><Navbar /><div style={{padding:'40px',textAlign:'center',color:'var(--muted)'}}>Acceso restringido</div></div>
  )

  return (
    <div style={{paddingBottom:'32px'}}>
      <Navbar />
      <div className="section">
        <div className="section-title" style={{marginBottom:'14px'}}>Panel de administración</div>

        {msg && <div className={styles.toast} onClick={() => setMsg('')}>{msg}</div>}

        <div className={styles.tabs}>
          {['partidos','solicitudes','apuestas'].map(t => (
            <button key={t} className={`${styles.tab} ${tab===t?styles.tabActive:''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {t==='solicitudes' && solicitudes.filter(s=>s.estado==='pendiente').length > 0 &&
                <span className={styles.dot}>{solicitudes.filter(s=>s.estado==='pendiente').length}</span>}
            </button>
          ))}
        </div>

        {tab === 'partidos' && (
          <>
            <div className={`card ${styles.formCard}`} style={{marginBottom:'12px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
              <div>
                <div style={{fontWeight:500,fontSize:'14px'}}>Importar partidos automáticamente</div>
                <div style={{fontSize:'12px',color:'var(--muted)',marginTop:'3px'}}>Trae todos los partidos del Mundial desde API-Football</div>
                {importMsg && <div style={{fontSize:'12px',color:'var(--green)',marginTop:'6px'}}>⏳ {importMsg}</div>}
              </div>
              <button className="btn btn-primary" style={{whiteSpace:'nowrap',flexShrink:0}} onClick={handleImport} disabled={importing}>
                {importing ? 'Importando...' : '⬇ Importar fixture'}
              </button>
            </div>
            <div className={`card ${styles.formCard}`}>
              <div className="section-title" style={{fontSize:'16px',marginBottom:'14px'}}>Agregar partido</div>
              <div className={styles.grid2}>
                <div className="form-group"><label>Emoji local</label><input value={newPartido.local} onChange={e=>setNewPartido({...newPartido,local:e.target.value})} placeholder="🇦🇷"/></div>
                <div className="form-group"><label>Nombre local</label><input value={newPartido.localName} onChange={e=>setNewPartido({...newPartido,localName:e.target.value})} placeholder="Argentina"/></div>
                <div className="form-group"><label>Emoji visitante</label><input value={newPartido.visitante} onChange={e=>setNewPartido({...newPartido,visitante:e.target.value})} placeholder="🇧🇷"/></div>
                <div className="form-group"><label>Nombre visitante</label><input value={newPartido.visitanteName} onChange={e=>setNewPartido({...newPartido,visitanteName:e.target.value})} placeholder="Brasil"/></div>
                <div className="form-group"><label>Hora / Fecha</label><input value={newPartido.hora} onChange={e=>setNewPartido({...newPartido,hora:e.target.value})} placeholder="Hoy · 21:00 hs"/></div>
                <div className="form-group"><label>Fase</label><input value={newPartido.fase} onChange={e=>setNewPartido({...newPartido,fase:e.target.value})} placeholder="Semifinal"/></div>
                <div className="form-group"><label>Cuota local</label><input type="number" step="0.1" value={newPartido.cuotaLocal} onChange={e=>setNewPartido({...newPartido,cuotaLocal:e.target.value})}/></div>
                <div className="form-group"><label>Cuota empate</label><input type="number" step="0.1" value={newPartido.cuotaEmpate} onChange={e=>setNewPartido({...newPartido,cuotaEmpate:e.target.value})}/></div>
                <div className="form-group"><label>Cuota visitante</label><input type="number" step="0.1" value={newPartido.cuotaVisitante} onChange={e=>setNewPartido({...newPartido,cuotaVisitante:e.target.value})}/></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label>ID Fixture API-Football (opcional — para resultados automáticos)</label><input type="number" value={newPartido.apiFixtureId} onChange={e=>setNewPartido({...newPartido,apiFixtureId:e.target.value})} placeholder="Ej: 1035693"/></div>
              </div>
              <button className="btn btn-primary" onClick={agregarPartido}>+ Agregar partido</button>
            </div>

            {partidos.map(p => (
              <div key={p.id} className={`card ${styles.partidoAdmin}`}>
                <div className={styles.pHeader}>
                  <span style={{fontSize:'15px',fontWeight:500}}>{p.local} {p.localName} vs {p.visitante} {p.visitanteName}</span>
                  <span className={`badge ${p.estado==='live'?'badge-live':p.estado==='proximo'?'badge-open':'badge-closed'}`}>{p.estado}</span>
                </div>
                <div className={styles.pActions}>
                  {p.estado === 'proximo' && <button className="btn btn-outline" style={{fontSize:'12px',padding:'6px 12px'}} onClick={() => cambiarEstado(p.id,'live')}>▶ Iniciar</button>}
                  {p.estado === 'live' && (
                    <>
                      <input placeholder="Ej: 2-1" className={styles.marcInput} id={`marc-${p.id}`} />
                      <button className="btn btn-outline" style={{fontSize:'12px',padding:'6px 12px'}} onClick={() => {
                        const m = document.getElementById(`marc-${p.id}`).value
                        cambiarEstado(p.id,'finalizado',m)
                      }}>✓ Finalizar</button>
                    </>
                  )}
                  {p.estado === 'finalizado' && (
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'12px',color:'var(--muted)',alignSelf:'center'}}>Resolver:</span>
                      {[{k:p.localName,l:`${p.local} ${p.localName}`},{k:'Empate',l:'Empate'},{k:p.visitanteName,l:`${p.visitante} ${p.visitanteName}`}].map(o=>(
                        <button key={o.k} className="btn btn-outline" style={{fontSize:'11px',padding:'5px 10px'}} onClick={() => resolverApuestas(p, o.k)}>{o.l} ganó</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'solicitudes' && solicitudes.map(s => (
          <div key={s.id} className={`card ${styles.solCard}`}>
            <div className={styles.pHeader}>
              <div>
                <div style={{fontWeight:500,fontSize:'14px'}}>{s.username} · {s.tipo === 'deposito' ? '↓ Depósito' : '↑ Retiro'}</div>
                <div style={{fontSize:'12px',color:'var(--muted)',marginTop:'2px'}}>{s.tipo === 'retiro' ? `CBU/Alias: ${s.cbu}` : 'Transferencia bancaria'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'18px',fontWeight:500,color:'var(--green)'}}>${s.monto?.toLocaleString('es-AR')}</div>
                <span className={`badge ${s.estado==='pendiente'?'badge-open':'badge-closed'}`}>{s.estado}</span>
              </div>
            </div>
            {s.estado === 'pendiente' && (
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <button className="btn btn-primary" style={{flex:1,fontSize:'13px',padding:'8px'}} onClick={() => s.tipo==='deposito' ? aprobarDeposito(s) : aprobarRetiro(s)}>
                  ✓ {s.tipo==='deposito' ? 'Acreditar' : 'Procesar'}
                </button>
                <button className="btn btn-danger" style={{flex:1,fontSize:'13px',padding:'8px'}} onClick={() => updateDoc(doc(db,'solicitudes',s.id),{estado:'rechazada'})}>
                  ✗ Rechazar
                </button>
              </div>
            )}
          </div>
        ))}

        {tab === 'apuestas' && apuestas.slice(0,30).map(a => (
          <div key={a.id} className={`card ${styles.solCard}`}>
            <div className={styles.pHeader}>
              <div>
                <div style={{fontWeight:500,fontSize:'13px'}}>{a.username}</div>
                <div style={{fontSize:'12px',color:'var(--muted)',marginTop:'2px'}}>{a.partidoNombre} · {a.equipo}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'14px',fontWeight:500}}>${a.monto?.toLocaleString('es-AR')} → ${a.ganancia?.toLocaleString('es-AR')}</div>
                <span className={`badge ${a.estado==='ganada'?'badge-win':a.estado==='perdida'?'badge-loss':a.estado==='pendiente'?'badge-open':'badge-closed'}`}>{a.estado}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
