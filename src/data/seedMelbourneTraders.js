/**
 * Seed 40 Melbourne traders with skills, preferences, and availability requests.
 * Skips traders whose alias already exists.
 */

import { getTraders, addTrader } from './traders.js'
import { addSkill } from './traderSkills.js'
import { saveAllPreferences } from './traderPreferences.js'
import { createRequest } from './availabilityRequests.js'

const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

const ROWS = [
  { first: 'Ben', last: 'Wilkins', alias: 'Wilko', location: 'Melbourne', primary: ['NBA', 2], secondary: ['CBB', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Monday', reqIn: '2026-03-11', reqOff: '2026-03-24' },
  { first: 'Josh', last: 'Harding', alias: 'JHard', location: 'Melbourne', primary: ['NFL', 1], secondary: ['NBA', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-09', reqOff: '2026-03-22' },
  { first: 'Matt', last: 'Spencer', alias: 'MSpence', location: 'Melbourne', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Wednesday', reqIn: '2026-03-14', reqOff: '2026-03-27' },
  { first: 'Tom', last: 'Gallagher', alias: 'TGall', location: 'Melbourne', primary: ['MLB', 2], secondary: ['NHL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Sunday', reqIn: '2026-03-12', reqOff: '2026-03-25' },
  { first: 'Luke', last: 'Anderson', alias: 'LAce', location: 'Melbourne', primary: ['NBA', 3], secondary: ['CBB', 2], preferredOn: ['NBA', 'Friday'], preferredOff: 'Thursday', reqIn: '2026-03-17', reqOff: '2026-03-30' },
  { first: 'Daniel', last: 'Fraser', alias: 'DFraz', location: 'Melbourne', primary: ['NFL', 2], secondary: ['CFB', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Monday', reqIn: '2026-03-10', reqOff: '2026-03-23' },
  { first: 'Callum', last: 'Price', alias: 'CPrice', location: 'Melbourne', primary: ['NHL', 1], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-15', reqOff: '2026-03-26' },
  { first: 'Jordan', last: 'Reid', alias: 'JReid', location: 'Melbourne', primary: ['NBA', 2], secondary: ['WNBA', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Sunday', reqIn: '2026-03-13', reqOff: '2026-03-28' },
  { first: 'Nathan', last: 'Cook', alias: 'Cooky', location: 'Melbourne', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Friday', reqIn: '2026-03-08', reqOff: '2026-03-21' },
  { first: 'Dylan', last: 'Moore', alias: 'DMo', location: 'Melbourne', primary: ['NFL', 2], secondary: ['MLB', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Wednesday', reqIn: '2026-03-11', reqOff: '2026-03-24' },
  { first: 'Sam', last: 'Porter', alias: 'Porter', location: 'Melbourne', primary: ['NBA', 1], secondary: ['CBB', 1], preferredOn: ['NBA', 'Wednesday'], preferredOff: 'Monday', reqIn: '2026-03-16', reqOff: '2026-03-27' },
  { first: 'Harry', last: 'Evans', alias: 'HEv', location: 'Melbourne', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Sunday', reqIn: '2026-03-09', reqOff: '2026-03-22' },
  { first: 'Max', last: 'Taylor', alias: 'MTay', location: 'Melbourne', primary: ['CFB', 2], secondary: ['CBB', 1], preferredOn: ['CFB', 'Saturday'], preferredOff: 'Thursday', reqIn: '2026-03-14', reqOff: '2026-03-28' },
  { first: 'Connor', last: 'Shaw', alias: 'CShaw', location: 'Melbourne', primary: ['NHL', 2], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-18', reqOff: '2026-03-29' },
  { first: 'Ryan', last: 'Bell', alias: 'RBell', location: 'Melbourne', primary: ['NBA', 2], secondary: ['CBB', 2], preferredOn: ['NBA', 'Friday'], preferredOff: 'Tuesday', reqIn: '2026-03-12', reqOff: '2026-03-26' },
  { first: 'Jake', last: 'Robertson', alias: 'Robbo', location: 'Melbourne', primary: ['NFL', 1], secondary: ['NBA', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Thursday', reqIn: '2026-03-10', reqOff: '2026-03-23' },
  { first: 'Ethan', last: 'Wallace', alias: 'EWall', location: 'Melbourne', primary: ['MLB', 2], secondary: ['NHL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Friday', reqIn: '2026-03-17', reqOff: '2026-03-30' },
  { first: 'Oscar', last: 'Hunt', alias: 'OHunt', location: 'Melbourne', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Sunday'], preferredOff: 'Monday', reqIn: '2026-03-11', reqOff: '2026-03-21' },
  { first: 'Leo', last: 'Knight', alias: 'LKnight', location: 'Melbourne', primary: ['NBA', 3], secondary: ['NFL', 2], preferredOn: ['NBA', 'Friday'], preferredOff: 'Wednesday', reqIn: '2026-03-16', reqOff: '2026-03-27' },
  { first: 'Zach', last: 'Dennis', alias: 'ZDen', location: 'Melbourne', primary: ['NFL', 2], secondary: ['CFB', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-13', reqOff: '2026-03-25' },
  { first: 'Will', last: 'Parsons', alias: 'WPar', location: 'Melbourne', primary: ['NHL', 1], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-08', reqOff: '2026-03-24' },
  { first: 'Toby', last: 'Grant', alias: 'TGrant', location: 'Melbourne', primary: ['NBA', 2], secondary: ['CBB', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Sunday', reqIn: '2026-03-12', reqOff: '2026-03-22' },
  { first: 'Mitch', last: 'Lawson', alias: 'MLaw', location: 'Melbourne', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Saturday', reqIn: '2026-03-15', reqOff: '2026-03-26' },
  { first: 'Aaron', last: 'Clarke', alias: 'AClark', location: 'Melbourne', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Friday'], preferredOff: 'Wednesday', reqIn: '2026-03-10', reqOff: '2026-03-23' },
  { first: 'Cameron', last: 'Fox', alias: 'CFox', location: 'Melbourne', primary: ['NFL', 1], secondary: ['MLB', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Thursday', reqIn: '2026-03-18', reqOff: '2026-03-29' },
  { first: 'Nick', last: 'Riley', alias: 'NRiley', location: 'Melbourne', primary: ['NBA', 2], secondary: ['NHL', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Tuesday', reqIn: '2026-03-13', reqOff: '2026-03-27' },
  { first: 'Brodie', last: 'Scott', alias: 'BScott', location: 'Melbourne', primary: ['MLB', 2], secondary: ['NBA', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Sunday', reqIn: '2026-03-16', reqOff: '2026-03-28' },
  { first: 'Lachlan', last: 'Ward', alias: 'LWard', location: 'Melbourne', primary: ['CFB', 1], secondary: ['NFL', 1], preferredOn: ['CFB', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-11', reqOff: '2026-03-24' },
  { first: 'Corey', last: 'Mills', alias: 'CMills', location: 'Melbourne', primary: ['NBA', 1], secondary: ['CBB', 1], preferredOn: ['NBA', 'Wednesday'], preferredOff: 'Friday', reqIn: '2026-03-14', reqOff: '2026-03-26' },
  { first: 'Bailey', last: 'Turner', alias: 'BTurn', location: 'Melbourne', primary: ['NHL', 2], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-17', reqOff: '2026-03-29' },
  { first: 'Sean', last: "O'Brien", alias: 'SOBrien', location: 'Melbourne', primary: ['NFL', 3], secondary: ['NBA', 2], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Thursday', reqIn: '2026-03-12', reqOff: '2026-03-30' },
  { first: 'Trent', last: 'Hill', alias: 'THill', location: 'Melbourne', primary: ['MLB', 1], secondary: ['NHL', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Monday', reqIn: '2026-03-09', reqOff: '2026-03-22' },
  { first: 'Kyle', last: 'Bennett', alias: 'KBenn', location: 'Melbourne', primary: ['NBA', 2], secondary: ['CBB', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Wednesday', reqIn: '2026-03-16', reqOff: '2026-03-25' },
  { first: 'Marcus', last: 'Dean', alias: 'MDean', location: 'Melbourne', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Sunday'], preferredOff: 'Thursday', reqIn: '2026-03-10', reqOff: '2026-03-21' },
  { first: 'Joel', last: 'Harvey', alias: 'JHarv', location: 'Melbourne', primary: ['NFL', 2], secondary: ['MLB', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-18', reqOff: '2026-03-28' },
  { first: 'Reece', last: 'Cole', alias: 'RCol', location: 'Melbourne', primary: ['NHL', 1], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-12', reqOff: '2026-03-23' },
  { first: 'Patrick', last: 'Lowe', alias: 'PLowe', location: 'Melbourne', primary: ['NBA', 2], secondary: ['WNBA', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Sunday', reqIn: '2026-03-11', reqOff: '2026-03-26' },
  { first: 'Dean', last: 'Cross', alias: 'DCross', location: 'Melbourne', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Friday', reqIn: '2026-03-15', reqOff: '2026-03-24' },
  { first: 'Simon', last: 'Hayes', alias: 'SHayes', location: 'Melbourne', primary: ['CFB', 2], secondary: ['NFL', 1], preferredOn: ['CFB', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-17', reqOff: '2026-03-29' },
  { first: 'Alex', last: 'Burton', alias: 'ABurt', location: 'Melbourne', primary: ['NBA', 1], secondary: ['CBB', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Monday', reqIn: '2026-03-13', reqOff: '2026-03-22' },
]

export function seedMelbourneTraders() {
  const existingAliases = new Set(getTraders().map((t) => t.alias))
  const toAdd = ROWS.filter((r) => !existingAliases.has(r.alias))
  if (toAdd.length === 0) return { added: 0 }

  const base = Date.now()
  let added = 0
  for (let i = 0; i < toAdd.length; i++) {
    const r = toAdd[i]
    const traderId = 'TR-melb-' + (base + i)
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
      note: 'Testing',
    })
    createRequest(traderId, {
      type: 'DAY_OFF',
      fromDate: r.reqOff,
      toDate: r.reqOff,
      note: 'Holiday',
    })
    added++
  }
  return { added }
}
