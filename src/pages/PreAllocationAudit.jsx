import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getAllocationOffices,
  getDefaultAllocationSelection,
} from '../domain/preAllocation/engine'
import { summarizeReadiness } from '../domain/preAllocation/readiness'
import styles from './AllocationEngine.module.css'

const OFFICE_LOCATIONS = getAllocationOffices()
const DEFAULT_SELECTION = getDefaultAllocationSelection()

function buildAuditParams(year, week, office) {
  const next = new URLSearchParams()
  if (year) next.set('year', String(year))
  if (week) next.set('week', String(week))
  if (office) next.set('office', String(office))
  return next
}

function buildAllocationHref(selection) {
  const params = buildAuditParams(selection.year, selection.week, selection.office)
  const suffix = params.toString()
  return suffix ? `/management/allocation-engine?${suffix}` : '/management/allocation-engine'
}

function buildAuditHref(selection) {
  const params = buildAuditParams(selection.year, selection.week, selection.office)
  const suffix = params.toString()
  return suffix ? `/management/pre-allocation-audit?${suffix}` : '/management/pre-allocation-audit'
}

function renderIssueList(items, keyPrefix) {
  return (
    <ul className={styles.auditList}>
      {items.map((item, index) => (
        <li key={`${keyPrefix}-${index}`}>
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function PreAllocationAudit() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialYear = Number(searchParams.get('year')) || DEFAULT_SELECTION.year
  const initialWeek = Number(searchParams.get('week')) || DEFAULT_SELECTION.week
  const initialOffice = searchParams.get('office') || ''

  const [yearInput, setYearInput] = useState(initialYear)
  const [weekInput, setWeekInput] = useState(initialWeek)
  const [officeInput, setOfficeInput] = useState(initialOffice)
  const [selection, setSelection] = useState({
    year: initialYear,
    week: initialWeek,
    office: initialOffice,
  })

  const readiness = useMemo(() => (
    selection.office
      ? summarizeReadiness(selection)
      : null
  ), [selection])

  const canOpen = !!officeInput

  const handleView = () => {
    if (!canOpen) return
    const nextSelection = {
      year: yearInput,
      week: weekInput,
      office: officeInput,
    }
    setSelection(nextSelection)
    setSearchParams(buildAuditParams(nextSelection.year, nextSelection.week, nextSelection.office))
  }

  const statusClass = !readiness
    ? styles.summaryItem
    : readiness.status.level === 'ready'
      ? styles.ok
      : readiness.status.level === 'not_ready'
        ? styles.gap
        : styles.summaryItem

  return (
    <main className={styles.page}>
      <section className={styles.section} aria-label="Audit setup">
        <h2 className={styles.sectionTitle}>Pre-Allocation Audit</h2>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <select
              className={styles.select}
              value={officeInput}
              onChange={(event) => setOfficeInput(event.target.value)}
            >
              <option value="">Location</option>
              {OFFICE_LOCATIONS.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select
              className={styles.select}
              value={yearInput}
              onChange={(event) => setYearInput(Number(event.target.value))}
            >
              {[DEFAULT_SELECTION.year - 1, DEFAULT_SELECTION.year, DEFAULT_SELECTION.year + 1].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select
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
            <button type="button" className={styles.primaryBtn} onClick={handleView} disabled={!canOpen}>
              View
            </button>
          </div>
        </div>
      </section>

      {!readiness ? (
        <section className={styles.section} aria-label="Audit prompt">
          <p className={styles.prompt}>Select a location and week to review readiness before allocation.</p>
        </section>
      ) : (
        <div className={styles.scrollWrap}>
          <section className={styles.section} aria-label="Overall readiness">
            <h2 className={styles.sectionTitle}>Overall Readiness</h2>
            <div className={styles.summaryRow}>
              <span className={`${styles.summaryItem} ${statusClass}`}>Status: {readiness.status.label}</span>
              <span className={styles.summaryItem}>Traders: {readiness.traders.activeCount}</span>
              <span className={styles.summaryItem}>Requirements: {readiness.requirements.totalCount}</span>
              <span className={styles.summaryItem}>Blocking: {readiness.status.blocking}</span>
              <span className={styles.summaryItem}>Warnings: {readiness.status.warnings}</span>
            </div>
            <div className={styles.actions}>
              <Link to={buildAllocationHref(selection)} className={styles.primaryBtn}>
                Open Allocation
              </Link>
            </div>
          </section>

          <section className={styles.section} aria-label="Trader readiness">
            <h2 className={styles.sectionTitle}>Trader Readiness</h2>
            <div className={styles.summaryRow}>
              <span className={styles.summaryItem}>Active: {readiness.traders.activeCount}</span>
              <span className={styles.summaryItem}>Missing Skills: {readiness.traders.missingSkillData.length}</span>
              <span className={styles.summaryItem}>Missing Availability: {readiness.traders.missingAvailability.length}</span>
              <span className={styles.summaryItem}>Invalid: {readiness.traders.invalidCount}</span>
              <span className={styles.summaryItem}>Warnings: {readiness.traders.warningCount}</span>
            </div>

            <div className={styles.auditWrap}>
              <h3 className={styles.auditTitle}>Coverage By Sport</h3>
              <div className={styles.breakdownRow}>
                {readiness.traders.countsBySport.map((row) => (
                  <span key={`sport-count-${row.sport}`} className={styles.traderChip}>
                    {row.sport}: {row.count}
                  </span>
                ))}
              </div>
            </div>

            {(readiness.traders.missingSkillData.length > 0 || readiness.traders.missingAvailability.length > 0 || readiness.traders.issues.length > 0) && (
              <div className={styles.auditWrap}>
                <h3 className={styles.auditTitle}>Trader Issues</h3>
                <div className={styles.auditLists}>
                  {readiness.traders.missingSkillData.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Missing Skill Data</p>
                      {renderIssueList(
                        readiness.traders.missingSkillData.slice(0, 8).map((trader) => trader.name),
                        'missing-skill'
                      )}
                    </div>
                  )}
                  {readiness.traders.missingAvailability.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Missing Availability</p>
                      {renderIssueList(
                        readiness.traders.missingAvailability.slice(0, 8).map((trader) => trader.name),
                        'missing-availability'
                      )}
                    </div>
                  )}
                  {readiness.traders.issues.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Validation Findings</p>
                      {renderIssueList(
                        readiness.traders.issues.slice(0, 8).map((issue) => `${issue.name}: ${issue.message}`),
                        'trader-issue'
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className={styles.section} aria-label="Requirement readiness">
            <h2 className={styles.sectionTitle}>Requirement Readiness</h2>
            <div className={styles.summaryRow}>
              <span className={styles.summaryItem}>Rows: {readiness.requirements.totalCount}</span>
              <span className={styles.summaryItem}>Demand: {readiness.requirements.totals.demand}</span>
              <span className={styles.summaryItem}>Games: {readiness.requirements.totals.games}</span>
              <span className={styles.summaryItem}>Invalid: {readiness.requirements.invalidRows.length}</span>
              <span className={styles.summaryItem}>Warnings: {readiness.requirements.warningRows.length}</span>
            </div>

            {!readiness.requirements.completeness.allSubmitted && (
              <div className={styles.auditWrap}>
                <h3 className={styles.auditTitle}>Missing Submission</h3>
                {renderIssueList(
                  readiness.requirements.completeness.missing.map((row) => `${row.dateStr} ${row.sport}`),
                  'missing-submission'
                )}
              </div>
            )}

            {(readiness.requirements.invalidRows.length > 0 || readiness.requirements.warningRows.length > 0 || readiness.requirements.suspiciousRows.length > 0 || readiness.requirements.duplicateRows.length > 0) && (
              <div className={styles.auditWrap}>
                <h3 className={styles.auditTitle}>Requirement Findings</h3>
                <div className={styles.auditLists}>
                  {readiness.requirements.invalidRows.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Invalid Rows</p>
                      {renderIssueList(
                        readiness.requirements.invalidRows.slice(0, 8).map((issue) => `${issue.date} ${issue.sport}: ${issue.message}`),
                        'invalid-row'
                      )}
                    </div>
                  )}
                  {readiness.requirements.warningRows.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Warning Rows</p>
                      {renderIssueList(
                        readiness.requirements.warningRows.slice(0, 8).map((issue) => `${issue.date} ${issue.sport}: ${issue.message}`),
                        'warning-row'
                      )}
                    </div>
                  )}
                  {readiness.requirements.suspiciousRows.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Suspicious Rows</p>
                      {renderIssueList(
                        readiness.requirements.suspiciousRows.slice(0, 8).map((issue) => `${issue.date} ${issue.sport}: ${issue.message}`),
                        'suspicious-row'
                      )}
                    </div>
                  )}
                  {readiness.requirements.duplicateRows.length > 0 && (
                    <div>
                      <p className={styles.auditHeading}>Duplicates</p>
                      {renderIssueList(
                        readiness.requirements.duplicateRows.map((issue) => `${issue.requirementId} (${issue.count})`),
                        'duplicate-row'
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.dayList}>
              {readiness.requirements.days.map((day) => (
                <article key={`audit-day-${day.dateStr}`} className={styles.dayCard}>
                  <header className={styles.dayHeader}>
                    <span className={styles.dayLabel}>{day.label}</span>
                    <span className={styles.dayMeta}>
                      {day.summary.games} games · demand {day.summary.demand}
                    </span>
                    <span className={styles.ratingBadge}>{day.summary.dayRating}</span>
                  </header>
                  <div className={styles.requirementBody}>
                    <div className={styles.breakdownRow}>
                      {day.sportBreakdown.map((row) => (
                        <span key={`${day.dateStr}-${row.sport}`} className={styles.traderChip}>
                          {row.sport}: {row.demand} / L{row.requiredCapability} / {row.officeGames} games
                        </span>
                      ))}
                      {day.sportBreakdown.length === 0 && <span className={styles.unassigned}>No requirement rows.</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-label="Allocation warnings">
            <h2 className={styles.sectionTitle}>Allocation Warnings</h2>
            {readiness.warnings.noEligible.length === 0 &&
            readiness.warnings.thinCoverage.length === 0 &&
            readiness.warnings.demandExceedsSupply.length === 0 &&
            readiness.warnings.singlePointFailures.length === 0 &&
            readiness.warnings.missingSeniorCoverage.length === 0 ? (
              <p className={styles.auditOk}>No allocation readiness warnings found.</p>
            ) : (
              <div className={styles.auditLists}>
                {readiness.warnings.noEligible.length > 0 && (
                  <div className={styles.auditWrap}>
                    <h3 className={styles.auditTitle}>No Eligible Traders</h3>
                    {renderIssueList(
                      readiness.warnings.noEligible.slice(0, 8).map((warning) => `${warning.date} ${warning.sport}: ${warning.message}`),
                      'no-eligible'
                    )}
                  </div>
                )}
                {readiness.warnings.demandExceedsSupply.length > 0 && (
                  <div className={styles.auditWrap}>
                    <h3 className={styles.auditTitle}>Demand Exceeds Supply</h3>
                    {renderIssueList(
                      readiness.warnings.demandExceedsSupply.slice(0, 8).map((warning) => `${warning.date} ${warning.sport}: ${warning.message}`),
                      'supply-gap'
                    )}
                  </div>
                )}
                {readiness.warnings.thinCoverage.length > 0 && (
                  <div className={styles.auditWrap}>
                    <h3 className={styles.auditTitle}>Thin Coverage</h3>
                    {renderIssueList(
                      readiness.warnings.thinCoverage.slice(0, 8).map((warning) => `${warning.date} ${warning.sport}: ${warning.message}`),
                      'thin-coverage'
                    )}
                  </div>
                )}
                {readiness.warnings.singlePointFailures.length > 0 && (
                  <div className={styles.auditWrap}>
                    <h3 className={styles.auditTitle}>Single Points Of Failure</h3>
                    {renderIssueList(
                      readiness.warnings.singlePointFailures.slice(0, 8).map((warning) => `${warning.date} ${warning.sport}: ${warning.message}`),
                      'single-point'
                    )}
                  </div>
                )}
                {readiness.warnings.missingSeniorCoverage.length > 0 && (
                  <div className={styles.auditWrap}>
                    <h3 className={styles.auditTitle}>Missing L3 Coverage</h3>
                    {renderIssueList(
                      readiness.warnings.missingSeniorCoverage.slice(0, 8).map((warning) => `${warning.date} ${warning.sport}: ${warning.message}`),
                      'missing-l3'
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={styles.section} aria-label="Flow actions">
            <h2 className={styles.sectionTitle}>Next Step</h2>
            <div className={styles.actions}>
              <Link to={buildAuditHref(selection)} className={styles.primaryBtn}>
                Refresh Audit
              </Link>
              <Link to={buildAllocationHref(selection)} className={styles.primaryBtn}>
                Allocation Engine
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
