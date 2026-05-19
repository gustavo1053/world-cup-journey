import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import styles from './Landing.module.css'

const PARTIDOS_PREVIEW = [
  { local: '🇦🇷', localName: 'Argentina', visitante: '🇧🇷', visitanteName: 'Brasil', hora: 'Hoy · 21:00 hs', fase: 'Semifinal' },
  { local: '🇫🇷', localName: 'Francia', visitante: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', visitanteName: 'Inglaterra', hora: 'Mañana · 18:00 hs', fase: 'Semifinal' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div>
      <Navbar />
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.trophy}>🏆</div>
        <h1 className={`${styles.h1} bebas`}>
          WORLD CUP<br /><span className={styles.accent}>JOURNEY</span>
        </h1>
        <p className={styles.sub}>
          Predecí resultados del Mundial, apostá en tiempo real y competí con miles de jugadores de toda Argentina.
        </p>
        <div className={styles.stats}>
          {[['4.821','Jugadores'],['64','Partidos'],['$2.4M','En premios']].map(([n,l]) => (
            <div key={l} className={styles.stat}>
              <div className={`${styles.statN} bebas`}>{n}</div>
              <div className={styles.statL}>{l}</div>
            </div>
          ))}
        </div>
        <div className={styles.btns}>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Empezar gratis</button>
          <button className="btn btn-outline" onClick={() => navigate('/login')}>Ya tengo cuenta</button>
        </div>
      </div>

      <div className="section" style={{paddingBottom: '32px'}}>
        <div className="section-header">
          <div className="section-title">Próximos partidos</div>
          <span className="badge badge-open">Abiertas</span>
        </div>
        {PARTIDOS_PREVIEW.map((p, i) => (
          <div key={i} className={`card ${styles.partidoPreview}`}>
            <div className={styles.pmeta}>
              <span style={{fontSize:'12px',color:'var(--muted)'}}>{p.hora} · {p.fase}</span>
              <span className="badge badge-open">Apostar</span>
            </div>
            <div className={styles.teams}>
              <div className={styles.team}><span className={styles.flag}>{p.local}</span><span>{p.localName}</span></div>
              <div className={`${styles.vs} bebas`}>VS</div>
              <div className={`${styles.team} ${styles.teamRight}`}><span className={styles.flag}>{p.visitante}</span><span>{p.visitanteName}</span></div>
            </div>
          </div>
        ))}
        <button className="btn btn-outline btn-block" style={{marginTop:'12px'}} onClick={() => navigate('/register')}>
          Ver fixture completo →
        </button>
      </div>
    </div>
  )
}
