import { Outlet } from 'react-router-dom'
import Banner from './Banner'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <Banner />
        <main className={styles.content}>
          <div className={styles.outlet}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
