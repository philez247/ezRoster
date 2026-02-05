import { Link } from 'react-router-dom'
import styles from './Placeholder.module.css'

export default function Owners() {
  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <h1 className={styles.title}>Owners</h1>
      <p className={styles.desc}>Owner settings will go here.</p>
    </main>
  )
}
