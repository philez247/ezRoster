import { Link } from 'react-router-dom'
import styles from './Placeholder.module.css'

export default function MyProfile() {
  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <h1 className={styles.title}>My Profile</h1>
      <p className={styles.desc}>Your profile settings will go here.</p>
    </main>
  )
}
