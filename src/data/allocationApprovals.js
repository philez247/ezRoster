const STORAGE_KEY = 'ez-roster-allocation-approvals'

function key(office, year, week) {
  return `${office || ''}|${Number(year) || 0}|${Number(week) || 0}`
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save allocation approvals:', e)
  }
}

export function getAllocationApproval(office, year, week) {
  const all = loadAll()
  return all[key(office, year, week)] || null
}

export function setAllocationApproval(office, year, week, approval) {
  const all = loadAll()
  all[key(office, year, week)] = approval
  saveAll(all)
  return all[key(office, year, week)]
}

export function clearAllocationApproval(office, year, week) {
  const all = loadAll()
  delete all[key(office, year, week)]
  saveAll(all)
}

