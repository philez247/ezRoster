import { Link } from 'react-router-dom'
import layoutStyles from './Home.module.css'
import styles from './Placeholder.module.css'

export default function OwnersShiftAssignment() {
  return (
    <main className={layoutStyles.page}>
      <Link to="/owners" className={styles.back}>
        ← Owners
      </Link>
      <h1 className={styles.title}>Shift Assignment</h1>
      <p className={styles.desc}>Shift Assignment content will go here.</p>
    </main>
  )
}
