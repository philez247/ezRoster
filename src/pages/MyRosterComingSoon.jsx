import { Link } from 'react-router-dom'
import styles from './Placeholder.module.css'

export default function MyRosterComingSoon() {
  return (
    <main className={styles.page}>
      <Link to="/my-profile" className={styles.back}>
        Back
      </Link>
      <h1 className={styles.title}>My Roster</h1>
      <p className={styles.desc}>Coming soon.</p>
    </main>
  )
}
