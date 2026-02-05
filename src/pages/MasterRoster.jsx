import { Link } from 'react-router-dom'
import styles from './Placeholder.module.css'

export default function MasterRoster() {
  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <h1 className={styles.title}>Roster</h1>
      <p className={styles.desc}>Roster view will go here.</p>
    </main>
  )
}
