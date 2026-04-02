import { replaceTraderDb } from './traderDb'
import { replaceAllSkills } from './traderSkills'

const DATASET_VERSION = 'real-life-headcount-v1'
const VERSION_KEY = 'ez-roster-dev-dataset-version'

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'CBB', 'CFB', 'WNBA']
const LOCATION_CONFIGS = [
  { location: 'Dublin', count: 20, ownerCount: 3, managerCount: 2, code: 'DBL' },
  { location: 'Melbourne', count: 60, ownerCount: 6, managerCount: 6, code: 'MEL' },
  { location: 'New Jersey', count: 60, ownerCount: 8, managerCount: 7, code: 'NJ' },
]

const FIRST_NAMES = [
  'Liam', 'Sean', 'Aidan', 'Conor', 'Eoin', 'Patrick', 'Daniel', 'Ciaran', 'Ronan', 'Tom',
  'Mark', 'Shane', 'Paul', 'Niall', 'Fergal', 'Kevin', 'Brian', 'Colm', 'Darragh', 'Kieran',
  'Luke', 'Sam', 'Ben', 'Josh', 'Matt', 'Ryan', 'Jake', 'Ethan', 'Oscar', 'Leo',
  'Zach', 'Will', 'Toby', 'Mitch', 'Aaron', 'Cameron', 'Nick', 'Brodie', 'Lachlan', 'Corey',
  'Bailey', 'Trent', 'Kyle', 'Marcus', 'Joel', 'Reece', 'Dean', 'Simon', 'Alex', 'Tyler',
  'Noah', 'Jason', 'Trevor', 'Adam', 'Chris', 'Justin', 'Tony', 'Jeff', 'Derek', 'Scott',
  'Nathan', 'Dylan', 'Harry', 'Max', 'Connor', 'Jordan', 'Callum', 'Logan', 'Blake', 'Parker',
]

const LAST_NAMES = [
  "O'Connell", 'Murphy', 'Walsh', 'Byrne', 'Fitzgerald', 'Nolan', 'Keane', 'Doyle', 'Hayes', 'Gallagher',
  'Brennan', 'Kavanagh', 'Rooney', 'Dunne', 'McGrath', "O'Shea", 'Flanagan', 'Reilly', 'Power', 'Sweeney',
  'Anderson', 'Adler', 'Wilkins', 'Harding', 'Spencer', 'Bell', 'Robertson', 'Wallace', 'Hunt', 'Knight',
  'Dennis', 'Parsons', 'Grant', 'Lawson', 'Clarke', 'Fox', 'Riley', 'Scott', 'Ward', 'Mills',
  'Turner', 'Hill', 'Bennett', 'Dean', 'Harvey', 'Cole', 'Cross', 'Burton', 'Reynolds', 'Brooks',
  'Miller', 'Levine', 'Carter', 'Coleman', 'Harrison', 'Russo', 'Feldman', 'Jenkins', 'Callahan', 'Weiss',
  'Simmons', 'Delaney', 'Cooper', 'Long', 'Bernstein', 'Townsend', 'Parker', 'Lombardi', 'Monroe', 'Vaughn',
]

const SPECIAL_NAMES = {
  Dublin: [
    ['Liam', "O'Connell"],
    ['Sean', 'Murphy'],
    ['Aidan', 'Walsh'],
    ['Conor', 'Byrne'],
    ['Eoin', 'Fitzgerald'],
  ],
  Melbourne: [
    ['Luke', 'Anderson'],
    ['Ben', 'Wilkins'],
    ['Josh', 'Harding'],
    ['Matt', 'Spencer'],
    ['Ryan', 'Bell'],
    ['Nick', 'Riley'],
  ],
  'New Jersey': [
    ['Sam', 'Adler'],
    ['Jack', 'Reynolds'],
    ['Ethan', 'Brooks'],
    ['Chris', 'Novak'],
    ['Mike', 'Donnelly'],
    ['Alex', 'Patterson'],
  ],
}

function makeAlias(code, index, firstName, lastName) {
  const first = (firstName || 'T').slice(0, 1).toUpperCase()
  const last = (lastName || 'R').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'TR'
  return `${code}${String(index + 1).padStart(3, '0')}${first}${last}`
}

function createPreferenceDays(primarySport, seed) {
  const preferredOn = seed % 7
  const preferredOff = (seed + 3) % 7
  return Array.from({ length: 7 }, (_, dayIndex) => {
    if (dayIndex === preferredOn) {
      return {
        dayIndex,
        preference: 'PREFERRED_ON',
        sport: primarySport,
        shiftTiming: seed % 2 === 0 ? 'FULL' : 'LATE',
      }
    }
    if (dayIndex === preferredOff) {
      return {
        dayIndex,
        preference: seed % 4 === 0 ? 'OFF' : 'PREFERRED_OFF',
        sport: '',
        shiftTiming: 'FULL',
      }
    }
    return {
      dayIndex,
      preference: 'NO_PREFERENCE',
      sport: '',
      shiftTiming: 'FULL',
    }
  })
}

function createRequestRecords(traderId, seed) {
  if (seed % 5 !== 0) return []
  const month = String((seed % 3) + 4).padStart(2, '0')
  const day = String((seed % 20) + 1).padStart(2, '0')
  const fromDate = `2026-${month}-${day}`
  return [
    {
      id: `REQ-${traderId}-OFF`,
      traderId,
      type: 'DAY_OFF',
      fromDate,
      toDate: fromDate,
      note: 'Seeded time off request',
      status: seed % 10 === 0 ? 'CONFIRMED' : 'PENDING',
    },
  ]
}

function buildProfiles() {
  const profiles = []
  let nameCursor = 0

  LOCATION_CONFIGS.forEach(({ location, count, ownerCount, managerCount, code }) => {
    const localProfiles = []
    const specials = SPECIAL_NAMES[location] || []

    for (let index = 0; index < count; index++) {
      const special = specials[index]
      const firstName = special?.[0] || FIRST_NAMES[nameCursor % FIRST_NAMES.length]
      const lastName = special?.[1] || LAST_NAMES[Math.floor(nameCursor / FIRST_NAMES.length) % LAST_NAMES.length]
      if (!special) nameCursor += 1

      const appUserLevel =
        index < ownerCount ? 'Owner' : index < ownerCount + managerCount ? 'Manager' : 'User'

      localProfiles.push({
        traderId: `${code}-TR-${String(index + 1).padStart(3, '0')}`,
        bio: {
          traderId: `${code}-TR-${String(index + 1).padStart(3, '0')}`,
          firstName,
          lastName,
          alias: makeAlias(code, index, firstName, lastName),
          location,
          active: true,
          appUserLevel,
          contractHours: 40,
          contractDays: 5,
          manager: '',
          weekendPct: '',
          inShiftPct: '',
        },
      })
    }

    const managerNames = localProfiles
      .filter((profile) => profile.bio.appUserLevel === 'Manager')
      .map((profile) => `${profile.bio.firstName} ${profile.bio.lastName}`)

    localProfiles.forEach((profile, index) => {
      if (managerNames.length > 0 && profile.bio.appUserLevel !== 'Manager') {
        profile.bio.manager = managerNames[index % managerNames.length]
      }
      profiles.push(profile)
    })
  })

  return profiles
}

function buildSkills(profiles) {
  const primaryCountBySport = new Map()

  return profiles.flatMap((profile, index) => {
    const primarySport = SPORTS[index % SPORTS.length]
    const primarySeen = primaryCountBySport.get(primarySport) || 0
    const primaryLevel = primarySeen < 2 ? 3 : primarySeen % 2 === 0 ? 1 : 2
    primaryCountBySport.set(primarySport, primarySeen + 1)

    const secondarySportOne = SPORTS[(index + 1) % SPORTS.length]
    const secondarySportTwo = SPORTS[(index + 3) % SPORTS.length]

    return [
      {
        id: `SK-${profile.traderId}-P`,
        traderId: profile.traderId,
        sport: primarySport,
        type: 'primary',
        level: primaryLevel,
      },
      {
        id: `SK-${profile.traderId}-S1`,
        traderId: profile.traderId,
        sport: secondarySportOne,
        type: 'secondary',
        level: index % 2 === 0 ? 1 : 2,
      },
      {
        id: `SK-${profile.traderId}-S2`,
        traderId: profile.traderId,
        sport: secondarySportTwo,
        type: 'secondary',
        level: index % 2 === 0 ? 2 : 1,
      },
    ]
  })
}

function buildDb(profiles, primarySportByTrader) {
  return {
    version: 1,
    traders: Object.fromEntries(
      profiles.map((profile, index) => [
        profile.traderId,
        {
          traderId: profile.traderId,
          bio: profile.bio,
          preferences: {
            ranges: [
              {
                rangeId: 'default',
                fromDate: '',
                toDate: '',
                days: createPreferenceDays(primarySportByTrader.get(profile.traderId), index),
              },
            ],
          },
          requests: createRequestRecords(profile.traderId, index),
        },
      ])
    ),
  }
}

export function syncDevTraderDataset() {
  const currentVersion = localStorage.getItem(VERSION_KEY)
  if (currentVersion === DATASET_VERSION) return

  const profiles = buildProfiles()
  const skills = buildSkills(profiles)
  const primarySportByTrader = new Map(
    skills
      .filter((skill) => skill.type === 'primary')
      .map((skill) => [skill.traderId, skill.sport])
  )

  replaceTraderDb(buildDb(profiles, primarySportByTrader))
  replaceAllSkills(skills)
  localStorage.setItem(VERSION_KEY, DATASET_VERSION)
}
