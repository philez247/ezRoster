import { useState } from 'react'
import {
  getConfig,
  addSport,
  removeSport,
  addLocation,
  removeLocation,
  addManager,
  removeManager,
} from '../config/store'
import layoutStyles from './Home.module.css'
import styles from './Configuration.module.css'

const PANELS = { sports: 'sports', locations: 'locations', managers: 'managers' }

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

  return (
    <main className={layoutStyles.page}>
      <div className={styles.accordion} role="list">
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
