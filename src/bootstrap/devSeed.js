import { syncDevTraderDataset } from '../data/devTraderDataset'
import { seedWeek22026RequirementsIfNeeded } from '../data/seedWeek22026Requirements'

function shouldSeedFixtures() {
  if (!import.meta.env.DEV) return false
  const flag = import.meta.env.VITE_ENABLE_FIXTURE_SEED
  return flag === undefined ? true : String(flag).toLowerCase() === 'true'
}

export function runDevSeed() {
  if (!shouldSeedFixtures()) return
  syncDevTraderDataset()
  seedWeek22026RequirementsIfNeeded()
}
