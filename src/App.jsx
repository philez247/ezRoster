import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import TraderDbHome from './pages/TraderDbHome'
import Traders from './pages/Traders'
import TraderForm from './pages/TraderForm'
import Management from './pages/Management'
import Preferences from './pages/Preferences'
import Availability from './pages/Availability'
import Configuration from './pages/Configuration'
import Administrators from './pages/Administrators'
import SkillLevels from './pages/SkillLevels'
import AvailabilityReport from './pages/AvailabilityReport'
import DayReport from './pages/DayReport'
import ViewDay from './pages/ViewDay'
import MyProfile from './pages/MyProfile'
import MasterRoster from './pages/MasterRoster'
import BIRSchedule from './pages/BIRSchedule'
import BIRScheduleMain from './pages/BIRScheduleMain'
import ESPNScraper from './pages/ESPNScraper'
import ESPNScraperSport from './pages/ESPNScraperSport'
import Owners from './pages/Owners'

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/master-roster" element={<MasterRoster />} />
        <Route path="/owners" element={<Owners />} />
        <Route path="/bir-schedule" element={<BIRSchedule />} />
        <Route path="/bir-schedule/main" element={<BIRScheduleMain />} />
        <Route path="/bir-schedule/espn-scraper" element={<ESPNScraper />} />
        <Route path="/bir-schedule/espn-scraper/:sport" element={<ESPNScraperSport />} />
        <Route path="/traders" element={<TraderDbHome />} />
        <Route path="/management" element={<Management />} />
        <Route path="/management/skill-levels" element={<SkillLevels />} />
        <Route path="/management/availability-report" element={<AvailabilityReport />} />
        <Route path="/management/day-report" element={<DayReport />} />
        <Route path="/management/view-day" element={<ViewDay />} />
        <Route path="/traders/list" element={<Traders />} />
        <Route path="/traders/new" element={<TraderForm />} />
        <Route path="/traders/preferences" element={<Preferences />} />
        <Route path="/traders/availability" element={<Availability />} />
        <Route path="/traders/:traderId" element={<TraderForm />} />
        <Route path="/configuration" element={<Configuration />} />
        <Route path="/administrators" element={<Administrators />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
