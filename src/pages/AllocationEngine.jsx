import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getUsername } from '../data/auth'
import {
  clearAllocationApproval,
  getAllocationApproval,
  setAllocationApproval,
} from '../data/allocationApprovals'
import {
  buildMasterRosterFromApproval,
  saveMasterRosterRecord,
} from '../data/masterRoster'
import {
  formatApprovalDateTime,
  getAllocationEngineOptions,
  getAllocationOffices,
  getDefaultAllocationSelection,
  getEmptyRequirementsSnapshot,
  loadRequirementSnapshot,
  runAllocationPreview,
} from '../domain/preAllocation/engine'
import styles from './AllocationEngine.module.css'

const OFFICE_LOCATIONS = getAllocationOffices()
const DEFAULT_SELECTION = getDefaultAllocationSelection()
const EMPTY_REQUIREMENTS = getEmptyRequirementsSnapshot()

function buildParams(year, week, office) {
  const next = new URLSearchParams()
  if (year) next.set('year', String(year))
  if (week) next.set('week', String(week))
  if (office) next.set('office', String(office))
  return next
}

export default function AllocationEngine() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentYear = Number(searchParams.get('year')) || DEFAULT_SELECTION.year
  const currentWeek = Number(searchParams.get('week')) || DEFAULT_SELECTION.week
  const currentOffice = searchParams.get('office') || ''
  const [yearInput, setYearInput] = useState(currentYear)
  const [weekInput, setWeekInput] = useState(currentWeek)
  const [officeInput, setOfficeInput] = useState(currentOffice)
  const [selection, setSelection] = useState({ year: currentYear, week: currentWeek, office: currentOffice })
  const [runPreview, setRunPreview] = useState(null)
  const [approval, setApproval] = useState(null)
  const [requirementsState, setRequirementsState] = useState({
    loading: false,
    data: EMPTY_REQUIREMENTS,
  })
  const [runState, setRunState] = useState({
    running: false,
    percent: 0,
    label: '',
  })

  const requirements = requirementsState.data

  useEffect(() => {
    setRunPreview(null)
    if (!selection.office) {
      setRequirementsState({ loading: false, data: EMPTY_REQUIREMENTS })
      setApproval(null)
      return undefined
    }

    setRequirementsState((current) => ({
      loading: true,
      data: current.data,
    }))

    const timer = setTimeout(() => {
      const data = loadRequirementSnapshot(selection.year, selection.week, selection.office)
      setRequirementsState({ loading: false, data })
      setApproval(getAllocationApproval(selection.office, selection.year, selection.week))
    }, 0)

    return () => clearTimeout(timer)
  }, [selection.year, selection.week, selection.office])

  const canOpen = !!officeInput
  const canRun =
    !!selection.office &&
    !requirementsState.loading &&
    !runState.running &&
    requirements.totals.demand > 0 &&
    requirements.completeness.allSubmitted

  const handleOpenSelection = () => {
    if (!canOpen) return
    const nextSelection = {
      office: officeInput,
      year: yearInput,
      week: weekInput,
    }
    setSelection(nextSelection)
    setSearchParams(buildParams(nextSelection.year, nextSelection.week, nextSelection.office))
  }

  const handleRunEngine = async () => {
    if (!canRun) return
    const settings = getAllocationEngineOptions()
    setRunState({
      running: true,
      percent: 5,
      label: 'Starting allocation engine',
    })
    try {
      const preview = await runAllocationPreview(requirements, selection.office, settings, ({ label, percent }) => {
        setRunState({
          running: true,
          percent,
          label,
        })
      })
      setRunPreview(preview)
      clearAllocationApproval(selection.office, selection.year, selection.week)
      setApproval(null)
      setRunState({
        running: false,
        percent: 100,
        label: 'Allocation run complete',
      })
    } catch (error) {
      setRunState({
        running: false,
        percent: 0,
        label: 'Allocation run failed',
      })
      throw error
    }
  }

  const handleApprove = () => {
    if (!runPreview || runPreview.audit.summary.blocking > 0) return
    const approvedAtIso = new Date().toISOString()
    const approvedBy = getUsername() || 'Manager'
    const payload = {
      approvedAtIso,
      approvedBy,
      office: selection.office,
      year: selection.year,
      week: selection.week,
      runAtIso: runPreview.ranAtIso,
      totals: runPreview.totals,
      audit: runPreview.audit.summary,
    }
    const saved = setAllocationApproval(selection.office, selection.year, selection.week, payload)
    const roster = buildMasterRosterFromApproval({
      office: selection.office,
      year: selection.year,
      week: selection.week,
      approvedBy,
      approvedAtIso,
      runPreview,
    })
    saveMasterRosterRecord(roster)
    setApproval(saved)
  }

  return (
    <main className={styles.page}>
      <section className={styles.section} aria-label="Engine setup">
        <h2 className={styles.sectionTitle}>Allocation Engine</h2>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <select
              id="office"
              className={styles.select}
              value={officeInput}
              onChange={(event) => setOfficeInput(event.target.value)}
            >
              <option value="">Location</option>
              {OFFICE_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select
              id="year"
              className={styles.select}
              value={yearInput}
              onChange={(event) => setYearInput(Number(event.target.value))}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select
              id="week"
              className={styles.select}
              value={weekInput}
              onChange={(event) => setWeekInput(Number(event.target.value))}
            >
              {Array.from({ length: 52 }, (_, index) => index + 1).map((week) => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterAction}>
            <button type="button" className={styles.primaryBtn} onClick={handleOpenSelection} disabled={!canOpen}>
              View
            </button>
          </div>
        </div>
        {!!selection.office && (
          <div className={styles.actions}>
            <Link
              to={`/management/pre-allocation-audit?${buildParams(selection.year, selection.week, selection.office).toString()}`}
              className={styles.primaryBtn}
            >
              Review Audit
            </Link>
          </div>
        )}
      </section>

      {!selection.office ? null : (
        <div className={styles.scrollWrap}>
          {(requirementsState.loading || runState.label) && (
            <section className={styles.section} aria-label="Engine progress">
              <h2 className={styles.sectionTitle}>Progress</h2>
              <div className={styles.progressWrap}>
                <div className={styles.progressMeta}>
                  <span className={styles.summaryItem}>
                    {requirementsState.loading ? 'Loading weekly requirements' : runState.label}
                  </span>
                  <span className={styles.progressPercent}>
                    {requirementsState.loading ? '...' : `${runState.percent}%`}
                  </span>
                </div>
                <div className={styles.progressBar} aria-hidden="true">
                <div
                    className={styles.progressFill}
                    style={{ width: `${requirementsState.loading ? 35 : runState.percent}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className={styles.section} aria-label="Requirements snapshot">
            <h2 className={styles.sectionTitle}>Requirements Snapshot</h2>
            <div className={styles.summaryRow}>
              <span className={styles.summaryItem}>Games: {requirements.totals.games}</span>
              <span className={styles.summaryItem}>Demand: {requirements.totals.demand}</span>
              <span className={styles.summaryItem}>Requested: {requirements.totals.requested}</span>
              <span className={styles.summaryItem}>Locked: {requirements.totals.locked}</span>
            </div>
            {!requirements.completeness.allSubmitted && (
              <p className={styles.unassigned}>
                Engine blocked until all requirements are submitted:
                {' '}
                {requirements.completeness.missing.map((row) => `${row.dateStr} ${row.sport}`).join(', ')}
              </p>
            )}
            {requirements.issues?.length > 0 && (
              <p className={styles.unassigned}>
                Data issues detected before allocation:
                {' '}
                {requirements.issues.slice(0, 4).map((issue) => `${issue.date} ${issue.sport} ${issue.message}`).join(', ')}
              </p>
            )}
            <div className={styles.dayList}>
              {requirements.days.map((day) => (
                <article key={day.dateStr} className={styles.dayCard}>
                  <header className={styles.dayHeader}>
                    <span className={styles.dayLabel}>{day.label}</span>
                    <span className={styles.dayMeta}>
                      {day.summary.games} games · demand {day.summary.demand} · requested {day.summary.requested}
                    </span>
                    <span className={styles.ratingBadge}>{day.summary.dayRating}</span>
                  </header>
                  <div className={styles.requirementBody}>
                    <div className={styles.breakdownRow}>
                      <span className={styles.assignedLabel}>Sports:</span>
                      {day.sportBreakdown.length > 0 ? day.sportBreakdown.map((row) => (
                        <span key={`${day.dateStr}-${row.sport}`} className={styles.traderChip}>
                          {row.sport}: {row.demand} needed / L{row.requiredCapability} / {row.officeGames} games
                        </span>
                      )) : <span className={styles.unassigned}>No assigned games</span>}
                    </div>
                    <div className={styles.breakdownRow}>
                      <span className={styles.assignedLabel}>Requested Traders:</span>
                      {day.requestedNames.length > 0 ? day.requestedNames.map((name) => (
                        <span key={`${day.dateStr}-${name}`} className={`${styles.traderChip} ${styles.okChip}`}>
                          {name}
                        </span>
                      )) : <span className={styles.unassigned}>None requested</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-label="Run engine">
            <h2 className={styles.sectionTitle}>Run</h2>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={handleRunEngine} disabled={!canRun}>
                {runState.running ? 'Running...' : 'Run Allocation'}
              </button>
            </div>
          </section>

          {runPreview && (
            <section className={styles.section} aria-label="Manager report">
              <h2 className={styles.sectionTitle}>Manager Report</h2>
              <div className={styles.summaryRow}>
                <span className={styles.summaryItem}>Demand: {runPreview.totals.demand}</span>
                <span className={styles.summaryItem}>Assigned: {runPreview.totals.assigned}</span>
                <span className={`${styles.summaryItem} ${runPreview.totals.gap > 0 ? styles.gap : styles.ok}`}>
                  Gap: {runPreview.totals.gap}
                </span>
                <span className={`${styles.summaryItem} ${runPreview.audit.summary.blocking > 0 ? styles.gap : styles.ok}`}>
                  Blocking Flags: {runPreview.audit.summary.blocking}
                </span>
              </div>

              <div className={styles.auditWrap}>
                <h3 className={styles.auditTitle}>Anomalies</h3>
                {runPreview.audit.summary.blocking === 0 ? (
                  <p className={styles.auditOk}>No blocking allocation issues found.</p>
                ) : (
                  <div className={styles.auditLists}>
                    {runPreview.audit.shortages.length > 0 && (
                      <div>
                        <p className={styles.auditHeading}>Unfilled Requirements</p>
                        <ul className={styles.auditList}>
                          {runPreview.audit.shortages.map((row) => (
                            <li key={`short-${row.dateStr}-${row.sport}`}>
                              {row.dateStr} {row.sport}: filled {row.assigned}/{row.demand}, gap {row.gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {runPreview.audit.missingL3.length > 0 && (
                      <div>
                        <p className={styles.auditHeading}>Missing L3 Coverage</p>
                        <ul className={styles.auditList}>
                          {runPreview.audit.missingL3.map((row) => (
                            <li key={`l3-${row.dateStr}-${row.sport}`}>
                              {row.dateStr} {row.sport}: no L3 assigned
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {runPreview.audit.duplicateLocked.length > 0 && (
                      <div>
                        <p className={styles.auditHeading}>Duplicate Locked Traders</p>
                        <ul className={styles.auditList}>
                          {runPreview.audit.duplicateLocked.map((row) => (
                            <li key={`locked-${row.dateStr}-${row.traderId}-${row.sport}`}>
                              {row.dateStr} {row.traderName}: already locked elsewhere before {row.sport}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.auditWrap}>
                <h3 className={styles.auditTitle}>Contract Balance</h3>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryItem}>Overscheduled: {runPreview.audit.summary.overscheduled}</span>
                  <span className={styles.summaryItem}>Underscheduled: {runPreview.audit.summary.underscheduled}</span>
                </div>
                {runPreview.audit.overscheduled.length === 0 && runPreview.audit.underscheduled.length === 0 ? (
                  <p className={styles.auditOk}>All traders match weekly contract-days.</p>
                ) : (
                  <div className={styles.auditLists}>
                    {runPreview.audit.overscheduled.length > 0 && (
                      <div>
                        <p className={styles.auditHeading}>Over Contract</p>
                        <ul className={styles.auditList}>
                          {runPreview.audit.overscheduled.slice(0, 8).map((row) => (
                            <li key={`over-${row.traderId}`}>
                              {row.name}: {row.assignedDays}/{row.targetDays} days
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {runPreview.audit.underscheduled.length > 0 && (
                      <div>
                        <p className={styles.auditHeading}>Under Contract</p>
                        <ul className={styles.auditList}>
                          {runPreview.audit.underscheduled.slice(0, 8).map((row) => (
                            <li key={`under-${row.traderId}`}>
                              {row.name}: {row.assignedDays}/{row.targetDays} days
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.dayList}>
                {runPreview.days.map((day) => (
                  <article key={`report-${day.dateStr}`} className={styles.dayCard}>
                    <header className={styles.dayHeader}>
                      <span className={styles.dayLabel}>{day.label}</span>
                      <span className={styles.dayMeta}>
                        {day.summary.games} games · assigned {day.summary.assigned}/{day.summary.demand}
                      </span>
                      <span className={day.summary.gap > 0 ? styles.gap : styles.ok}>gap {day.summary.gap}</span>
                    </header>
                    <div className={styles.requirementBody}>
                      <div className={styles.breakdownRow}>
                        <span className={styles.assignedLabel}>Assigned Traders:</span>
                        {day.assignedNames.length > 0 ? day.assignedNames.map((name) => (
                          <span key={`${day.dateStr}-${name}`} className={styles.traderChip}>{name}</span>
                        )) : <span className={styles.unassigned}>None</span>}
                      </div>
                      <div className={styles.breakdownRow}>
                        <span className={styles.assignedLabel}>Sports:</span>
                        {day.sportAllocations.map((allocation) => (
                          <span
                            key={`${day.dateStr}-${allocation.sport}`}
                            className={allocation.gap > 0 ? styles.unassigned : `${styles.traderChip} ${styles.okChip}`}
                          >
                            {allocation.sport}: {allocation.assigned.length}/{allocation.demand}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.approvalWrap}>
                <h3 className={styles.auditTitle}>Manager Sign Off</h3>
                {approval ? (
                  <p className={styles.auditOk}>
                    Approved by {approval.approvedBy} on {formatApprovalDateTime(approval.approvedAtIso)}.
                  </p>
                ) : (
                  <p className={styles.unassigned}>No approval yet.</p>
                )}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleApprove}
                    disabled={runPreview.audit.summary.blocking > 0}
                  >
                    Approve Engine Output
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
