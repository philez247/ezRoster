import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_USER_ID, DEVELOPER_USER_ID } from '../data/auth'
import { getTraderById } from '../data/traders'
import { getConfig } from '../config/store'
import {
  getSkillsByTraderId,
  addSkill,
  updateSkill,
  removeSkill,
  LEVELS as SKILL_LEVELS,
} from '../data/traderSkills'
import styles from './MySports.module.css'

function SkillEditor({ skill, sports, onSave, onCancel, onRemove, isNew = false }) {
  const [sport, setSport] = useState(skill?.sport || '')
  const [type, setType] = useState(skill?.type || 'primary')
  const [level, setLevel] = useState(skill?.level || 1)

  return (
    <div className={styles.editor}>
      <select value={sport} onChange={(e) => setSport(e.target.value)} className={styles.select}>
        <option value="">Sport</option>
        {sports.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value)} className={styles.select}>
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
      </select>
      <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={styles.select}>
        {SKILL_LEVELS.map((item) => (
          <option key={item} value={item}>
            Level {item}
          </option>
        ))}
      </select>
      <div className={styles.editorActions}>
        <button
          type="button"
          onClick={() => {
            if (!sport) return
            onSave({ sport, type, level })
          }}
          className={styles.primaryBtn}
        >
          {isNew ? 'Add' : 'Save'}
        </button>
        {!isNew && (
          <button type="button" onClick={onRemove} className={styles.removeBtn}>
            Remove
          </button>
        )}
        <button type="button" onClick={onCancel} className={styles.secondaryBtn}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function MySports() {
  const { activeTraderId } = useAuth()
  const traderId = activeTraderId && activeTraderId !== ADMIN_USER_ID && activeTraderId !== DEVELOPER_USER_ID ? activeTraderId : ''
  const trader = traderId ? getTraderById(traderId) : null
  const [sports, setSports] = useState(() => getConfig().sports || [])
  const [skills, setSkills] = useState(() => (traderId ? getSkillsByTraderId(traderId) : []))
  const [editingId, setEditingId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setSports(getConfig().sports || [])
  }, [])

  useEffect(() => {
    if (!traderId) {
      setSkills([])
      return
    }
    setSkills(getSkillsByTraderId(traderId))
  }, [traderId])

  if (!trader) {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p className={styles.empty}>No active trader.</p>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        {!adding ? (
          <button type="button" onClick={() => setAdding(true)} className={styles.addBtn}>
            Add Sport
          </button>
        ) : (
          <SkillEditor
            skill={{ sport: '', type: 'primary', level: 1 }}
            sports={sports}
            isNew
            onSave={({ sport, type, level }) => {
              addSkill(traderId, sport, type, level)
              setSkills(getSkillsByTraderId(traderId))
              setAdding(false)
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </section>

      <section className={styles.listSection}>
        <div className={styles.scrollWindow}>
          {skills.length === 0 ? (
            <p className={styles.empty}>No sports added yet.</p>
          ) : (
            <ul className={styles.list}>
              {skills.map((skill) => (
                <li key={skill.id} className={styles.item}>
                  {editingId === skill.id ? (
                    <SkillEditor
                      skill={skill}
                      sports={sports}
                      onSave={(updates) => {
                        updateSkill(skill.id, updates)
                        setSkills(getSkillsByTraderId(traderId))
                        setEditingId('')
                      }}
                      onCancel={() => setEditingId('')}
                      onRemove={() => {
                        removeSkill(skill.id)
                        setSkills(getSkillsByTraderId(traderId))
                        setEditingId('')
                      }}
                    />
                  ) : (
                    <div className={styles.skillCard}>
                      <div className={styles.skillContent}>
                        <div className={styles.skillRow}>
                          <span className={styles.skillLabel}>Sport</span>
                          <span className={styles.skillValue}>{skill.sport}</span>
                        </div>
                        <div className={styles.skillTags}>
                          <span className={styles.primaryTag}>
                            {skill.type === 'primary' ? 'Primary' : 'Secondary'}
                          </span>
                          <span className={styles.levelTag}>Level {skill.level}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingId(skill.id)}
                        className={styles.editBtn}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
