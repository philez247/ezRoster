import { useState } from 'react'
import {
  getConfig,
  addSport,
  removeSport,
  addLocation,
  removeLocation,
  addManager,
  removeManager,
  addRoleForSport,
  removeRoleForSport,
  getRolesForSport,
} from '../config/store'
import {
  getAllocationEngineSettings,
  setAllocationEngineSettings,
} from '../data/allocationEngineSettings'
import layoutStyles from './Home.module.css'
import styles from './Configuration.module.css'

const PANELS = {
  sports: 'sports',
  locations: 'locations',
  managers: 'managers',
  allocationEngine: 'allocationEngine',
  traderRoles: 'traderRoles',
}

function OptionList({ items, onAdd, onRemove, placeholder, addLabel, emptyLabel }) {
  const [input, setInput] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    const name = input.trim()
    if (!name) return
    onAdd(name)
    setInput('')
  }

  return (
    <div className={styles.panelContent}>
      <form onSubmit={handleAdd} className={styles.addRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
          aria-label={addLabel}
        />
        <button type="submit" className={styles.addBtn} aria-label={`Add ${addLabel}`}>
          Add
        </button>
      </form>
      <ul className={styles.list} aria-label={`List of ${addLabel}`}>
        {items.length === 0 ? (
          <li className={styles.empty}>{emptyLabel}</li>
        ) : (
          items.map((item) => (
            <li key={item} className={styles.item}>
              <span className={styles.itemLabel}>{item}</span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                className={styles.removeBtn}
                aria-label={`Remove ${item}`}
                title={`Remove ${item}`}
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function AccordionPanel({ id, title, open, onToggle, children }) {
  return (
    <section
      className={styles.accordionItem}
      aria-labelledby={`${id}-heading`}
    >
      <button
        type="button"
        id={`${id}-heading`}
        className={styles.accordionHeader}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <span className={styles.accordionTitle}>{title}</span>
        <span className={styles.accordionIcon} aria-hidden data-open={open}>
          ▼
        </span>
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        className={styles.accordionPanel}
        data-open={open}
        aria-hidden={!open}
      >
        {children}
      </div>
    </section>
  )
}

function AllocationEngineSettingsPanel() {
  const [settings, setSettings] = useState(() => getAllocationEngineSettings())

  const update = (nextPatch) => {
    const next = setAllocationEngineSettings({ ...settings, ...nextPatch })
    setSettings(next)
  }

  return (
    <div className={styles.panelContent}>
      <div className={styles.settingsGrid}>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.includeNoPreference}
            onChange={(e) => update({ includeNoPreference: e.target.checked })}
          />
          Include No Preference traders
        </label>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.protectLockedPerDay}
            onChange={(e) => update({ protectLockedPerDay: e.target.checked })}
          />
          Protect locked assignments per day
        </label>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.countLockedTowardWeeklyCap}
            onChange={(e) => update({ countLockedTowardWeeklyCap: e.target.checked })}
          />
          Count locked assignments toward weekly cap
        </label>
        <label className={styles.numberRow}>
          Max games per trader (week)
          <input
            type="number"
            min={1}
            max={14}
            className={styles.numberInput}
            value={settings.maxGamesPerTrader}
            onChange={(e) => update({ maxGamesPerTrader: Number(e.target.value) || 1 })}
          />
        </label>
      </div>
    </div>
  )
}

function TraderRolesPanel({ sports, onAddRole, onRemoveRole }) {
  const normalizedSports = Array.from(
    new Set(
      [
        ...sports,
        'NBA',
        'NFL',
        'NHL',
        'MLB',
        'WNBA',
        'NCAAM',
        'CFB',
        'Other',
      ].map((s) => (s || '').trim().toUpperCase()).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const [selectedSport, setSelectedSport] = useState(normalizedSports[0] || 'NBA')
  const [newRole, setNewRole] = useState('')

  const roles = getRolesForSport(selectedSport)

  const submit = (e) => {
    e.preventDefault()
    const name = (newRole || '').trim()
    if (!name) return
    onAddRole(selectedSport, name)
    setNewRole('')
  }

  return (
    <div className={styles.panelContent}>
      <div className={styles.roleToolbar}>
        <select
          className={styles.input}
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          aria-label="Select sport for roles"
        >
          {normalizedSports.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <form onSubmit={submit} className={styles.addRow}>
        <input
          type="text"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          placeholder="e.g. Cores, Props, Other"
          className={styles.input}
          aria-label="Add trader role"
        />
        <button type="submit" className={styles.addBtn}>Add</button>
      </form>

      <ul className={styles.list} aria-label={`Roles for ${selectedSport}`}>
        {roles.length === 0 ? (
          <li className={styles.empty}>No roles set.</li>
        ) : (
          roles.map((role) => (
            <li key={`${selectedSport}-${role}`} className={styles.item}>
              <span className={styles.itemLabel}>{role}</span>
              <button
                type="button"
                onClick={() => {
                  onRemoveRole(selectedSport, role)
                }}
                className={styles.removeBtn}
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default function Configuration() {
  const [config, setConfig] = useState(() => getConfig())
  const [openPanel, setOpenPanel] = useState(null)

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  const handleAddSport = (name) => {
    setConfig(addSport(name))
  }
  const handleRemoveSport = (name) => {
    setConfig(removeSport(name))
  }
  const handleAddLocation = (name) => {
    setConfig(addLocation(name))
  }
  const handleRemoveLocation = (name) => {
    setConfig(removeLocation(name))
  }
  const handleAddManager = (name) => {
    setConfig(addManager(name))
  }
  const handleRemoveManager = (name) => {
    setConfig(removeManager(name))
  }
  const handleAddRoleForSport = (sport, role) => {
    setConfig(addRoleForSport(sport, role))
  }
  const handleRemoveRoleForSport = (sport, role) => {
    setConfig(removeRoleForSport(sport, role))
  }

  return (
    <main className={layoutStyles.page}>
      <div className={styles.accordion} role="list">
        <AccordionPanel
          id="allocation-engine"
          title="Allocation Engine"
          open={openPanel === PANELS.allocationEngine}
          onToggle={() => togglePanel(PANELS.allocationEngine)}
        >
          <AllocationEngineSettingsPanel />
        </AccordionPanel>

        <AccordionPanel
          id="sports"
          title="Sports"
          open={openPanel === PANELS.sports}
          onToggle={() => togglePanel(PANELS.sports)}
        >
          <OptionList
            items={config.sports}
            onAdd={handleAddSport}
            onRemove={handleRemoveSport}
            placeholder="e.g. Basketball, Soccer"
            addLabel="sport"
            emptyLabel="No sports added yet."
          />
        </AccordionPanel>

        <AccordionPanel
          id="trader-roles"
          title="Trader Roles by Sport"
          open={openPanel === PANELS.traderRoles}
          onToggle={() => togglePanel(PANELS.traderRoles)}
        >
          <TraderRolesPanel
            sports={config.sports}
            onAddRole={handleAddRoleForSport}
            onRemoveRole={handleRemoveRoleForSport}
          />
        </AccordionPanel>

        <AccordionPanel
          id="locations"
          title="Locations"
          open={openPanel === PANELS.locations}
          onToggle={() => togglePanel(PANELS.locations)}
        >
          <OptionList
            items={config.locations}
            onAdd={handleAddLocation}
            onRemove={handleRemoveLocation}
            placeholder="e.g. NYC, London"
            addLabel="location"
            emptyLabel="No locations added yet."
          />
        </AccordionPanel>

        <AccordionPanel
          id="managers"
          title="Managers"
          open={openPanel === PANELS.managers}
          onToggle={() => togglePanel(PANELS.managers)}
        >
          <OptionList
            items={config.managers}
            onAdd={handleAddManager}
            onRemove={handleRemoveManager}
            placeholder="e.g. Manager name"
            addLabel="manager"
            emptyLabel="No managers added yet."
          />
        </AccordionPanel>
      </div>
    </main>
  )
}
