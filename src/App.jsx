import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from './data/auth'
import { getTraderById } from './data/traders'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import TraderDbHome from './pages/TraderDbHome'
import Traders from './pages/Traders'
import TraderForm from './pages/TraderForm'
import Management from './pages/Management'
import ManagementRequests from './pages/ManagementRequests'
import Preferences from './pages/Preferences'
import Availability from './pages/Availability'
import Configuration from './pages/Configuration'
import Administrators from './pages/Administrators'
import SkillLevels from './pages/SkillLevels'
import AvailabilityReport from './pages/AvailabilityReport'
import DayReport from './pages/DayReport'
import ManagementShiftRequirements from './pages/ManagementShiftRequirements'
import PreAllocationAudit from './pages/PreAllocationAudit'
import AllocationEngine from './pages/AllocationEngine'
import ViewDay from './pages/ViewDay'
import MyProfile from './pages/MyProfile'
import MyAvailability from './pages/MyAvailability'
import MySports from './pages/MySports'
import MyRosterComingSoon from './pages/MyRosterComingSoon'
import MasterRoster from './pages/MasterRoster'
import BIRSchedule from './pages/BIRSchedule'
import BIRScheduleMain from './pages/BIRScheduleMain'
import ESPNScraper from './pages/ESPNScraper'
import ESPNScraperSport from './pages/ESPNScraperSport'
import Owners from './pages/Owners'
import OwnersResources from './pages/OwnersResources'
import OwnersRequirements from './pages/OwnersRequirements'
import OwnersShiftAssignment from './pages/OwnersShiftAssignment'

function useCurrentUserLevel() {
  const { activeTraderId } = useAuth()
  if (activeTraderId === DEVELOPER_USER_ID) return 'Developer'
  if (activeTraderId === ADMIN_USER_ID) return 'Admin'
  const trader = activeTraderId ? getTraderById(activeTraderId) : null
  return trader?.appUserLevel || 'User'
}

function RoleGuard({ allow, redirectTo = '/', children }) {
  const level = useCurrentUserLevel()
  if (!allow.includes(level)) return <Navigate to={redirectTo} replace />
  return children
}

function TraderSelfGuard({ children }) {
  const { activeTraderId } = useAuth()
  const level = useCurrentUserLevel()
  const { traderId } = useParams()

  if (level === 'Manager' || level === 'Admin' || level === 'Developer') return children
  if (activeTraderId && traderId === activeTraderId) return children
  return <Navigate to="/my-profile" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/my-availability" element={<MyAvailability />} />
        <Route path="/my-sports" element={<MySports />} />
        <Route path="/my-roster" element={<MyRosterComingSoon />} />

        <Route
          path="/master-roster"
          element={(
            <RoleGuard allow={['Owner', 'Manager', 'Admin', 'Developer']} redirectTo="/my-roster">
              <MasterRoster />
            </RoleGuard>
          )}
        />

        <Route
          path="/owners"
          element={(
            <RoleGuard allow={['Owner', 'Manager', 'Admin', 'Developer']}>
              <Owners />
            </RoleGuard>
          )}
        />
        <Route
          path="/owners/coverage"
          element={<Navigate to="/owners/resources" replace />}
        />
        <Route
          path="/owners/resources"
          element={(
            <RoleGuard allow={['Owner', 'Manager', 'Admin', 'Developer']}>
              <OwnersResources />
            </RoleGuard>
          )}
        />
        <Route
          path="/owners/requirements"
          element={(
            <RoleGuard allow={['Owner', 'Manager', 'Admin', 'Developer']}>
              <OwnersRequirements />
            </RoleGuard>
          )}
        />
        <Route
          path="/owners/assignment"
          element={(
            <RoleGuard allow={['Owner', 'Manager', 'Admin', 'Developer']}>
              <OwnersShiftAssignment />
            </RoleGuard>
          )}
        />
        <Route
          path="/owners/shift-assignment"
          element={<Navigate to="/owners/assignment" replace />}
        />

        <Route path="/bir-schedule" element={<BIRSchedule />} />
        <Route path="/bir-schedule/main" element={<BIRScheduleMain />} />
        <Route path="/bir-schedule/espn-scraper" element={<ESPNScraper />} />
        <Route path="/bir-schedule/espn-scraper/:sport" element={<ESPNScraperSport />} />

        <Route
          path="/traders"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']} redirectTo="/my-profile">
              <TraderDbHome />
            </RoleGuard>
          )}
        />

        <Route
          path="/management"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <Management />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/shift-requirements"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <ManagementShiftRequirements />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/pre-allocation-audit"
          element={(
            <RoleGuard allow={['Owner', 'Manager', 'Admin', 'Developer']}>
              <PreAllocationAudit />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/allocation-engine"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <AllocationEngine />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/skill-levels"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <SkillLevels />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/availability-report"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <AvailabilityReport />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/requests"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <ManagementRequests />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/day-report"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <DayReport />
            </RoleGuard>
          )}
        />
        <Route
          path="/management/view-day"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']}>
              <ViewDay />
            </RoleGuard>
          )}
        />

        <Route
          path="/traders/list"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']} redirectTo="/my-profile">
              <Traders />
            </RoleGuard>
          )}
        />
        <Route
          path="/traders/new"
          element={(
            <RoleGuard allow={['Manager', 'Admin', 'Developer']} redirectTo="/my-profile">
              <TraderForm />
            </RoleGuard>
          )}
        />
        <Route path="/traders/preferences" element={<Preferences />} />
        <Route path="/traders/availability" element={<Availability />} />
        <Route
          path="/traders/:traderId"
          element={(
            <TraderSelfGuard>
              <TraderForm />
            </TraderSelfGuard>
          )}
        />

        <Route
          path="/configuration"
          element={(
            <RoleGuard allow={['Admin', 'Developer']}>
              <Configuration />
            </RoleGuard>
          )}
        />
        <Route
          path="/administrators"
          element={(
            <RoleGuard allow={['Admin', 'Developer']}>
              <Administrators />
            </RoleGuard>
          )}
        />
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
