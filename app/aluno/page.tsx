import Link from 'next/link'
import styles from './page.module.css'

export default function AlunoPage() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>WORKSHOP<span>Portal</span></div>
          <nav className={styles.nav}>
            <Link href="/aluno" className={styles.navLink}>Meus Cursos</Link>
            <Link href="/aluno/perfil" className={styles.navLink}>Meu Perfil</Link>
          </nav>
          <div className={styles.avatar}>AB</div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcome}>
          <h1>Bem-vindo, <span className={styles.gold}>Aluno</span></h1>
          <p>Continue de onde parou ou escolha um novo conteúdo</p>
        </div>

        <h2 className={styles.sectionTitle}>Meus Cursos</h2>
        <div className={styles.grid}>
          {[
            { title: 'Workshop Sucesso e Mentalidade Financeira', progress: 0, image: 'https://images.unsplash.com/photo-1579621970563-ebecb6565ba6?w=400&h=250&fit=crop', modules: 8, lessons: 24 },
            { title: 'Workshop Mente de Sucesso', progress: 12, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop', modules: 6, lessons: 18 },
            { title: 'Eneagrama Aplicado às Finanças', progress: 45, image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop', modules: 4, lessons: 12 },
          ].map((course, i) => (
            <Link href={`/aluno/${course.title.toLowerCase().replace(/\s+/g, '-')}`} key={i} className={styles.card}>
              <div className={styles.cardImage}>
                <img src={course.image} alt={course.title} />
                <div className={styles.playOverlay}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <div className={styles.cardContent}>
                <h3>{course.title}</h3>
                <p>{course.modules} módulos · {course.lessons} aulas</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${course.progress}%` }} />
                </div>
                <span className={styles.progressLabel}>{course.progress}% completo</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
