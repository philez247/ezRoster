/**
 * Seed 40 New Jersey traders with skills, preferences, and availability requests.
 * Skips traders whose alias already exists.
 */

import { getTraders, addTrader } from './traders.js'
import { addSkill } from './traderSkills.js'
import { saveAllPreferences } from './traderPreferences.js'
import { createRequest } from './availabilityRequests.js'

const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

const ROWS = [
  { first: 'Mike', last: 'Donnelly', alias: 'DTrain', location: 'New Jersey', primary: ['NFL', 2], secondary: ['NBA', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-11', reqOff: '2026-03-20' },
  { first: 'Jack', last: 'Reynolds', alias: 'JRex', location: 'New Jersey', primary: ['NBA', 2], secondary: ['CBB', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Monday', reqIn: '2026-03-09', reqOff: '2026-03-24' },
  { first: 'Chris', last: 'Novak', alias: 'CNova', location: 'New Jersey', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Wednesday', reqIn: '2026-03-13', reqOff: '2026-03-22' },
  { first: 'Alex', last: 'Patterson', alias: 'Patch', location: 'New Jersey', primary: ['NFL', 3], secondary: ['CFB', 2], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Thursday', reqIn: '2026-03-15', reqOff: '2026-03-28' },
  { first: 'Ryan', last: "O'Hara", alias: 'ROH', location: 'New Jersey', primary: ['MLB', 2], secondary: ['NHL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Sunday', reqIn: '2026-03-10', reqOff: '2026-03-25' },
  { first: 'Ethan', last: 'Brooks', alias: 'EBro', location: 'New Jersey', primary: ['NBA', 1], secondary: ['WNBA', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Tuesday', reqIn: '2026-03-12', reqOff: '2026-03-21' },
  { first: 'Sam', last: 'Levine', alias: 'SLev', location: 'New Jersey', primary: ['NHL', 2], secondary: ['NFL', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-14', reqOff: '2026-03-27' },
  { first: 'Josh', last: 'Miller', alias: 'JMill', location: 'New Jersey', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Friday'], preferredOff: 'Sunday', reqIn: '2026-03-08', reqOff: '2026-03-23' },
  { first: 'Ben', last: 'Carter', alias: 'BCar', location: 'New Jersey', primary: ['NFL', 1], secondary: ['NBA', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Saturday', reqIn: '2026-03-16', reqOff: '2026-03-29' },
  { first: 'Matt', last: 'Coleman', alias: 'Coles', location: 'New Jersey', primary: ['NBA', 3], secondary: ['CBB', 2], preferredOn: ['NBA', 'Friday'], preferredOff: 'Wednesday', reqIn: '2026-03-17', reqOff: '2026-03-30' },
  { first: 'Luke', last: 'Harrison', alias: 'LHawk', location: 'New Jersey', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Sunday', reqIn: '2026-03-09', reqOff: '2026-03-26' },
  { first: 'Tyler', last: 'Grant', alias: 'TGrantNJ', location: 'New Jersey', primary: ['CFB', 2], secondary: ['CBB', 1], preferredOn: ['CFB', 'Saturday'], preferredOff: 'Thursday', reqIn: '2026-03-11', reqOff: '2026-03-22' },
  { first: 'Kevin', last: 'Russo', alias: 'KRus', location: 'New Jersey', primary: ['NBA', 2], secondary: ['NHL', 1], preferredOn: ['NBA', 'Wednesday'], preferredOff: 'Monday', reqIn: '2026-03-15', reqOff: '2026-03-27' },
  { first: 'Aaron', last: 'Feldman', alias: 'Feld', location: 'New Jersey', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Sunday'], preferredOff: 'Friday', reqIn: '2026-03-10', reqOff: '2026-03-21' },
  { first: 'Nick', last: 'Wallace', alias: 'NWall', location: 'New Jersey', primary: ['NFL', 2], secondary: ['MLB', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-14', reqOff: '2026-03-28' },
  { first: 'Daniel', last: 'Kim', alias: 'DKim', location: 'New Jersey', primary: ['NHL', 1], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-13', reqOff: '2026-03-25' },
  { first: 'Rob', last: 'Jenkins', alias: 'RJen', location: 'New Jersey', primary: ['NBA', 2], secondary: ['CBB', 2], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Sunday', reqIn: '2026-03-12', reqOff: '2026-03-29' },
  { first: 'Steven', last: 'Moore', alias: 'SMo', location: 'New Jersey', primary: ['MLB', 1], secondary: ['NFL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Friday', reqIn: '2026-03-09', reqOff: '2026-03-24' },
  { first: 'Brian', last: 'Callahan', alias: 'BCash', location: 'New Jersey', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-16', reqOff: '2026-03-27' },
  { first: 'Andrew', last: 'Weiss', alias: 'AWeiss', location: 'New Jersey', primary: ['NFL', 1], secondary: ['CFB', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Thursday', reqIn: '2026-03-11', reqOff: '2026-03-22' },
  { first: 'Paul', last: 'Simmons', alias: 'PSim', location: 'New Jersey', primary: ['NBA', 2], secondary: ['NHL', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Monday', reqIn: '2026-03-15', reqOff: '2026-03-26' },
  { first: 'Mark', last: 'Delaney', alias: 'DMark', location: 'New Jersey', primary: ['MLB', 2], secondary: ['NBA', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Sunday', reqIn: '2026-03-13', reqOff: '2026-03-28' },
  { first: 'Jason', last: 'Cooper', alias: 'Coop', location: 'New Jersey', primary: ['CBB', 1], secondary: ['CFB', 1], preferredOn: ['CBB', 'Sunday'], preferredOff: 'Wednesday', reqIn: '2026-03-10', reqOff: '2026-03-23' },
  { first: 'Trevor', last: 'Long', alias: 'TLong', location: 'New Jersey', primary: ['NFL', 2], secondary: ['NBA', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Thursday', reqIn: '2026-03-17', reqOff: '2026-03-30' },
  { first: 'Adam', last: 'Stein', alias: 'AStein', location: 'New Jersey', primary: ['NBA', 1], secondary: ['WNBA', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Tuesday', reqIn: '2026-03-09', reqOff: '2026-03-21' },
  { first: 'Chris', last: "O'Neill", alias: 'CON', location: 'New Jersey', primary: ['NHL', 2], secondary: ['NFL', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Monday', reqIn: '2026-03-14', reqOff: '2026-03-25' },
  { first: 'Justin', last: 'Price', alias: 'JPrice', location: 'New Jersey', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Friday'], preferredOff: 'Sunday', reqIn: '2026-03-12', reqOff: '2026-03-27' },
  { first: 'Noah', last: 'Bernstein', alias: 'NBern', location: 'New Jersey', primary: ['NBA', 1], secondary: ['MLB', 1], preferredOn: ['NBA', 'Wednesday'], preferredOff: 'Friday', reqIn: '2026-03-11', reqOff: '2026-03-24' },
  { first: 'Kyle', last: 'Matthews', alias: 'KMat', location: 'New Jersey', primary: ['NFL', 3], secondary: ['NBA', 2], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Tuesday', reqIn: '2026-03-18', reqOff: '2026-03-29' },
  { first: 'Eric', last: 'Townsend', alias: 'ETown', location: 'New Jersey', primary: ['MLB', 1], secondary: ['NHL', 1], preferredOn: ['MLB', 'Tuesday'], preferredOff: 'Saturday', reqIn: '2026-03-09', reqOff: '2026-03-22' },
  { first: 'Will', last: 'Parker', alias: 'WPark', location: 'New Jersey', primary: ['CFB', 2], secondary: ['NFL', 1], preferredOn: ['CFB', 'Saturday'], preferredOff: 'Thursday', reqIn: '2026-03-16', reqOff: '2026-03-28' },
  { first: 'Dan', last: 'Silver', alias: 'DSilv', location: 'New Jersey', primary: ['NBA', 2], secondary: ['CBB', 1], preferredOn: ['NBA', 'Friday'], preferredOff: 'Monday', reqIn: '2026-03-13', reqOff: '2026-03-25' },
  { first: 'Joe', last: 'Lombardi', alias: 'JLomb', location: 'New Jersey', primary: ['NFL', 1], secondary: ['MLB', 1], preferredOn: ['NFL', 'Monday'], preferredOff: 'Sunday', reqIn: '2026-03-10', reqOff: '2026-03-23' },
  { first: 'Pete', last: 'Hoffman', alias: 'PHoff', location: 'New Jersey', primary: ['NHL', 1], secondary: ['NBA', 1], preferredOn: ['NHL', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-15', reqOff: '2026-03-27' },
  { first: 'Sam', last: 'Adler', alias: 'SAd', location: 'New Jersey', primary: ['CBB', 2], secondary: ['NBA', 1], preferredOn: ['CBB', 'Friday'], preferredOff: 'Wednesday', reqIn: '2026-03-11', reqOff: '2026-03-24' },
  { first: 'Tony', last: 'Russo', alias: 'TRus', location: 'New Jersey', primary: ['MLB', 2], secondary: ['NFL', 1], preferredOn: ['MLB', 'Wednesday'], preferredOff: 'Sunday', reqIn: '2026-03-14', reqOff: '2026-03-28' },
  { first: 'Jeff', last: 'Monroe', alias: 'JMon', location: 'New Jersey', primary: ['NBA', 1], secondary: ['NHL', 1], preferredOn: ['NBA', 'Thursday'], preferredOff: 'Monday', reqIn: '2026-03-12', reqOff: '2026-03-26' },
  { first: 'Derek', last: 'Vaughn', alias: 'DV', location: 'New Jersey', primary: ['NFL', 2], secondary: ['CFB', 1], preferredOn: ['NFL', 'Sunday'], preferredOff: 'Friday', reqIn: '2026-03-17', reqOff: '2026-03-30' },
  { first: 'Scott', last: 'Miller', alias: 'SMill', location: 'New Jersey', primary: ['CBB', 1], secondary: ['NBA', 1], preferredOn: ['CBB', 'Saturday'], preferredOff: 'Tuesday', reqIn: '2026-03-10', reqOff: '2026-03-22' },
]

export function seedNewJerseyTraders() {
  const existingAliases = new Set(getTraders().map((t) => t.alias))
  const toAdd = ROWS.filter((r) => !existingAliases.has(r.alias))
  if (toAdd.length === 0) return { added: 0 }

  const base = Date.now()
  let added = 0
  for (let i = 0; i < toAdd.length; i++) {
    const r = toAdd[i]
    const traderId = 'TR-nj-' + (base + i)
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
