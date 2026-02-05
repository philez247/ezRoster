/**
 * Seed 20 Dublin traders with skills, preferences, and availability requests.
 * Skips traders whose alias already exists.
 */

import { getTraders, addTrader } from './traders.js'
import { addSkill } from './traderSkills.js'
import { saveAllPreferences } from './traderPreferences.js'
import { createRequest } from './availabilityRequests.js'

const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

const ROWS = [
  { first: 'Liam', last: "O'Connell", alias: 'OC7', location: 'Dublin', primary: ['NFL', 2], secondary: ['NBA', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-10', reqOff: '2026-03-18', noteIn: 'Testing', noteOff: 'Holiday' },
  { first: 'Sean', last: 'Murphy', alias: 'MurphX', location: 'Dublin', primary: ['NBA', 2], secondary: ['CBB', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Monday', reqIn: '2026-03-12', reqOff: '2026-03-22', noteIn: '', noteOff: '' },
  { first: 'Conor', last: 'Byrne', alias: 'CBurn', location: 'Dublin', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Wednesday', reqIn: '2026-03-08', reqOff: '2026-03-20', noteIn: '', noteOff: '' },
  { first: 'Aidan', last: 'Walsh', alias: 'AWol', location: 'Dublin', primary: ['NFL', 3], secondary: ['CFB', 2], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Thursday', reqIn: '2026-03-15', reqOff: '2026-03-27', noteIn: '', noteOff: '' },
  { first: 'Eoin', last: 'Fitzgerald', alias: 'Fitz9', location: 'Dublin', primary: ['MLB', 2], secondary: ['NHL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Sunday', reqIn: '2026-03-11', reqOff: '2026-03-25', noteIn: '', noteOff: '' },
  { first: 'Patrick', last: 'Nolan', alias: 'PN8', location: 'Dublin', primary: ['NBA', 1], secondary: ['WNBA', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Monday', reqIn: '2026-03-09', reqOff: '2026-03-19', noteIn: '', noteOff: '' },
  { first: 'Daniel', last: 'Keane', alias: 'DKane', location: 'Dublin', primary: ['NHL', 2], secondary: ['NFL', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-14', reqOff: '2026-03-23', noteIn: '', noteOff: '' },
  { first: 'Ciaran', last: 'Doyle', alias: 'Doyler', location: 'Dublin', primary: ['CBB', 2], secondary: ['CFB', 1], preferredOn: ['CBB', 'Friday'], preferredOff: 'Sunday', reqIn: '2026-03-07', reqOff: '2026-03-21', noteIn: '', noteOff: '' },
  { first: 'Ronan', last: 'Hayes', alias: 'RHaze', location: 'Dublin', primary: ['NFL', 1], secondary: ['NBA', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Saturday', reqIn: '2026-03-13', reqOff: '2026-03-26', noteIn: '', noteOff: '' },
  { first: 'Tom', last: 'Gallagher', alias: 'TGal', location: 'Dublin', primary: ['NBA', 3], secondary: ['CBB', 2], preferredOn: ['NBA', 'Friday'], preferredOff: 'Wednesday', reqIn: '2026-03-16', reqOff: '2026-03-29', noteIn: '', noteOff: '' },
  { first: 'Mark', last: 'Brennan', alias: 'Breno', location: 'Dublin', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Sunday', reqIn: '2026-03-10', reqOff: '2026-03-24', noteIn: '', noteOff: '' },
  { first: 'Shane', last: 'Kavanagh', alias: 'Kav', location: 'Dublin', primary: ['CFB', 2], secondary: ['CBB', 1], preferredOn: ['CFB', 'Saturday'], preferredOff: 'Thursday', reqIn: '2026-03-17', reqOff: '2026-03-28', noteIn: '', noteOff: '' },
  { first: 'Paul', last: 'Rooney', alias: 'Roo', location: 'Dublin', primary: ['NBA', 2], secondary: ['NHL', 1], preferredOn: ['NBA', 'Wednesday'], preferredOff: 'Monday', reqIn: '2026-03-11', reqOff: '2026-03-20', noteIn: '', noteOff: '' },
  { first: 'Niall', last: 'Dunne', alias: 'NDun', location: 'Dublin', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Sunday'], preferredOff: 'Friday', reqIn: '2026-03-09', reqOff: '2026-03-22', noteIn: '', noteOff: '' },
  { first: 'Fergal', last: 'McGrath', alias: 'FMG', location: 'Dublin', primary: ['NFL', 2], secondary: ['MLB', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-12', reqOff: '2026-03-27', noteIn: '', noteOff: '' },
  { first: 'Kevin', last: "O'Shea", alias: 'KOS', location: 'Dublin', primary: ['NHL', 1], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-14', reqOff: '2026-03-26', noteIn: '', noteOff: '' },
  { first: 'Brian', last: 'Flanagan', alias: 'Flanno', location: 'Dublin', primary: ['NBA', 2], secondary: ['CBB', 2], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Sunday', reqIn: '2026-03-15', reqOff: '2026-03-30', noteIn: '', noteOff: '' },
  { first: 'Colm', last: 'Reilly', alias: 'CRex', location: 'Dublin', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Friday', reqIn: '2026-03-08', reqOff: '2026-03-21', noteIn: '', noteOff: '' },
  { first: 'Darragh', last: 'Power', alias: 'Pow', location: 'Dublin', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-16', reqOff: '2026-03-25', noteIn: '', noteOff: '' },
  { first: 'Kieran', last: 'Sweeney', alias: 'KSwee', location: 'Dublin', primary: ['NFL', 1], secondary: ['CFB', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Thursday', reqIn: '2026-03-13', reqOff: '2026-03-28', noteIn: '', noteOff: '' },
]

export function seedDublinTraders() {
  const existingAliases = new Set(getTraders().map((t) => t.alias))
  const toAdd = ROWS.filter((r) => !existingAliases.has(r.alias))
  if (toAdd.length === 0) return { added: 0 }

  const base = Date.now()
  let added = 0
  for (let i = 0; i < toAdd.length; i++) {
    const r = toAdd[i]
    const traderId = 'TR-dublin-' + (base + i)
    const trader = {
      traderId,
      firstName: r.first,
      lastName: r.last,
      alias: r.alias,
      location: r.location,
      active: true,
      appUserLevel: 'User',
      contractHours: 40,
      contractDays: 5,
      manager: '',
      weekendPct: '',
      inShiftPct: '',
    }
    addTrader(trader)
    addSkill(traderId, r.primary[0], 'primary', r.primary[1])
    addSkill(traderId, r.secondary[0], 'secondary', r.secondary[1])

    const prefs = Array.from({ length: 7 }, () => ({
      preference: 'NO_PREFERENCE',
      sport: '',
      shiftTiming: 'FULL',
    }))
    const onDayIndex = DAY_INDEX[r.preferredOn[1]]
    const offDayIndex = DAY_INDEX[r.preferredOff]
    if (onDayIndex !== undefined) {
      prefs[onDayIndex] = { preference: 'PREFERRED_ON', sport: r.preferredOn[0], shiftTiming: 'FULL' }
    }
    if (offDayIndex !== undefined) {
      prefs[offDayIndex] = { preference: 'OFF', sport: '', shiftTiming: 'FULL' }
    }
    saveAllPreferences(traderId, prefs, {})

    createRequest(traderId, {
      type: 'DAY_IN',
      fromDate: r.reqIn,
      toDate: r.reqIn,
      note: r.noteIn || 'Testing',
    })
    createRequest(traderId, {
      type: 'DAY_OFF',
      fromDate: r.reqOff,
      toDate: r.reqOff,
      note: r.noteOff || 'Holiday',
    })
    added++
  }
  return { added }
}
