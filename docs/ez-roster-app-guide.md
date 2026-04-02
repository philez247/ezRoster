# EZ Roster Prototype — Full Guide

## 1. Executive Summary

EZ Roster Prototype is a role-based scheduling and staffing application for trader operations across multiple offices and sports.

It is designed to answer four linked questions:

1. what games exist
2. which office owns each game
3. how many traders that office needs by day and sport
4. which traders should work that week

The app is structured so each role contributes to one specific planning layer instead of everyone editing the same thing.

The planning chain is:

1. schedule ingestion
2. coverage ownership
3. local requirements
4. manager review
5. allocation engine
6. manager sign-off
7. approved rota output

## 2. Core Terminology

- `Roster` = the trader database, meaning all traders
- `Rota` = who works when
- `Coverage` = which location is responsible for a game
- `Requirements` = what a location needs on a given day and sport
- `Assignment` = the post-roster step where owners assign shifts / roles after staffing is known
- `Master Roster` = the manager-facing source-of-truth window into the trader database

## 3. Business Model

The app models the operation in layers.

### 3.1 Schedule layer

Schedules come into the app through BIR / ESPN schedule workflows.

This layer answers:

- what games exist
- on what date and time
- for what sport

### 3.2 Coverage layer

Coverage is the global owner workflow.

This layer answers:

- which office covers each game

Coverage does not decide staffing numbers.

### 3.3 Requirements layer

Requirements is the local owner workflow.

This layer answers:

- for one `day + location + sport`
- how many traders are needed
- which traders are preferred
- how busy the day is
- what capability level is needed
- whether the requirement has been submitted

### 3.4 Allocation layer

Allocation is the manager workflow.

This layer answers:

- for one office and one week
- who should work each day
- which sport they should cover
- whether the office demand has been filled

### 3.5 Assignment layer

Assignment happens after the rota has been approved.

This layer answers:

- among the people working that day
- who gets which shift / role

## 4. Timezone Model

The planning model is ET-first.

- the weekly slate is built in Eastern Time
- requirements are keyed against ET dates
- owner planning is done against ET dates

Melbourne still needs to be understood as a local operation that is effectively a day ahead in local time. The current app treats ET as the scheduling key and then uses display and downstream logic to account for that operational difference.

## 5. User Levels

## 5.1 Developer

Developer mode is the unrestricted mode.

What Developer can do:

- access all routes
- access all tabs
- impersonate any trader
- access admin and configuration pages
- bypass normal role restrictions

Developer is also the fallback identity if the app has no valid trader selected.

## 5.2 Admin

Admin is the system operator role.

What Admin can do:

- everything Manager can do
- access `Administrators`
- access `Configuration`

Admin is distinct from Developer. Developer is the real unrestricted environment role; Admin is an application identity.

## 5.3 Manager

Manager is the weekly staffing control role.

What Manager can do:

- standard user self-service
- owner pages
- management pages:
  - `Master Roster`
  - `Allocation Engine`
  - `Availability Report`
  - `Requests`
- trader database access
- add trader
- edit trader
- review and approve engine output

## 5.4 Owner

Owner is the sports planning role.

What Owner can do:

- standard user self-service
- `Coverage`
- `Requirements`
- `Assignment`
- `Master Roster`

What Owner does not do:

- run the allocation engine
- approve manager output
- access admin-only tools

## 5.5 User

User is the standard trader-facing role.

What User can do:

- `My Profile`
- `BIR Schedule`
- self-only requests / preferences / sports / availability
- self-only profile record access

What User cannot do:

- open management tools
- open owner planning tools
- open administrator pages
- open other traders' records

## 6. Home Experience By Role

### 6.1 Standard user home

Standard user home is intentionally narrow:

- `My Profile`
- `Roster`
- `BIR Schedule`

### 6.2 Owner home

Owner home inherits user features and adds owner planning:

- user-level cards
- owner-level access to the owner menu

### 6.3 Manager home

Manager home inherits user and owner capabilities and adds management:

- `Master Roster`
- `Allocation Engine`
- `Availability Report`
- `Requests`

### 6.4 Admin / Developer home

Admin and Developer can reach the administrator and system paths as well.

## 7. Standard User Workflow

The standard user experience is centered around `My Profile`.

Inside `My Profile`, the current cards are:

- `My Roster`
- `Preferences`
- `Requests`
- `Sports`
- `My Profile`
- `Availability`
- `Sign Out`

### 7.1 Preferences

This is where a trader sets recurring working preferences against date ranges and days of the week.

### 7.2 Requests

This is where a trader asks for:

- `DAY_OFF`
- `DAY_IN`

### 7.3 Sports

This is where a trader defines their sport skill profile:

- primary sport
- secondary sports
- skill levels

### 7.4 Availability

This is the user-facing summary / log view of relevant availability and approved request context.

## 8. Owner Workflow

Owners work in three stages.

### 8.1 Coverage

Coverage is the global slate ownership workflow.

Owner selects:

- year
- week

Then opens a day and reviews the ET slate.

The main purpose is to assign a location to each game.

Coverage should answer:

- which office covers this game

Coverage is not intended to set staffing numbers.

### 8.2 Requirements

Requirements is the office-specific planning workflow.

Owner selects:

- year
- week
- location

Then opens a day and works at the `day + location + sport` level.

The owner enters:

- `tradersNeeded`
- `requestedTraderIds`
- `demandLevel`
- `capabilityLevel`
- `confirmedAt`

Owner can also review availability by status before deciding requests or daily needs.

### 8.3 Assignment

Assignment is the later workflow.

It only becomes meaningful after a roster has been set, because it is about turning an approved staffing outcome into actual shift / role placement.

## 9. Manager Workflow

Manager is the operational review and approval layer.

The intended manager sequence is:

1. review the trader database in `Master Roster`
2. review office availability and trader requests
3. verify owner requirements are complete
4. run the allocation engine by location and week
5. review anomalies
6. approve output

## 10. Management Pages

### 10.1 Master Roster

Master Roster is the manager-facing source-of-truth window into the trader database.

Current sub-pages:

- `Summary`
- `View Roster`
- `Add Trader`
- `Edit Trader`

`View Roster` and `Edit Trader` support filtering by:

- location
- sport
- user level
- skill level
- search text

### 10.2 Availability Report

This is the manager reporting view of availability conditions across the operation.

### 10.3 Requests

Manager requests currently split into:

- `This Manager`
- `This Location`

This supports:

- manager-specific approval context
- office-wide awareness of request load

### 10.4 Allocation Engine

This is where manager builds the first-draft rota proposal for one location and week.

## 11. Data Architecture

The app is currently a local-storage application, not yet a server-backed production system.

That means the browser is the persistence layer.

The structure is still important because it defines the domain contracts the future backend would likely need to preserve.

## 11.1 Trader DB

Primary storage key:

- `ez-roster-trader-db-v1`

Shape:

- `traders`
  - keyed by `traderId`
  - each profile contains:
    - `bio`
    - `preferences`
    - `requests`

### Trader bio fields

- `traderId`
- `firstName`
- `lastName`
- `alias`
- `location`
- `active`
- `appUserLevel`
- `contractHours`
- `contractDays`
- `manager`
- `weekendPct`
- `inShiftPct`

## 11.2 Preference model

Preferences are range-based.

Each trader can have one or more ranges.

Each range contains:

- `rangeId`
- `fromDate`
- `toDate`
- 7 day rows

Each day row contains:

- `dayIndex`
- `preference`
- `sport`
- `shiftTiming`

Preference values:

- `NO_PREFERENCE`
- `OFF`
- `PREFERRED_OFF`
- `PREFERRED_ON`
- `ON`

## 11.3 Request model

Requests live inside the trader profile.

Each request contains:

- `id`
- `traderId`
- `type`
- `fromDate`
- `toDate`
- `note`
- `status`

Request types:

- `DAY_OFF`
- `DAY_IN`

Request statuses:

- `PENDING`
- `CONFIRMED`
- `CANCELLED`

## 11.4 Skill model

Primary storage key:

- `ez-roster-trader-skills`

Each skill row contains:

- `id`
- `traderId`
- `sport`
- `type`
  - `primary`
  - `secondary`
- `level`
  - `1`
  - `2`
  - `3`

## 11.5 Coverage assignment model

Coverage assignments connect games to locations.

Conceptually they store:

- game identity
- assigned location
- optionally any pre-locked trader references

This is the bridge between the schedule layer and the local requirement layer.

## 11.6 Canonical owner requirement model

Primary storage key:

- `ez-roster-owner-daily-requirements`

Canonical uniqueness:

- `date + location + sport`

Fields:

- `tradersNeeded`
- `demandLevel`
- `requestedTraderIds`
- `capabilityLevel`
- `confirmedAt`

This is the main planning contract for manager review and allocation.

## 11.7 Allocation approval model

Allocation approval stores:

- office
- year
- week
- approver
- approval time
- engine run time
- totals
- audit summary

## 11.8 Master roster model

Primary storage key:

- `ez-roster-master-roster`

This is the approved rota artifact.

Stored fields:

- `office`
- `year`
- `week`
- `status`
- `approvedBy`
- `approvedAtIso`
- `runAtIso`
- `totals`
- `days`

Each saved day contains:

- `dateStr`
- `games`
- `demand`
- `working`
- `notWorking`

## 12. Route And Permission Model

The app does not depend only on hidden cards. It also protects routes.

Examples:

- standard users cannot manually open management or admin pages
- standard users cannot manually browse to other traders' profiles
- owner pages are owner / manager / admin / developer only
- configuration is admin / developer only
- developer mode bypasses normal role restrictions

## 13. Authentication Model

Authentication is currently simple local app auth.

Characteristics:

- fixed username / password check
- browser session storage
- session expiry
- active user impersonation through session selection

Session contains:

- authenticated username
- expiry
- active trader identity

Special identities:

- `Developer`
- `Admin`

## 14. Current Development Dataset

The development dataset is role-aware and deterministic.

Configured distribution:

- Dublin
  - 20 total
  - 3 owners
  - 2 managers
- Melbourne
  - 60 total
  - 6 owners
  - 6 managers
- New Jersey
  - 60 total
  - 8 owners
  - 7 managers

Each trader currently has:

- 1 primary sport
- 2 secondary sports
- seeded preferences
- seeded requests for part of the dataset

Skill design:

- each sport gets a small number of L3 primary specialists first
- remaining primary levels alternate between L1 and L2
- secondary sports alternate between L1 and L2

## 15. Allocation Engine Detailed Explanation

The current engine is a first-draft manager tool, but it already follows the right structural idea.

### 15.1 Preconditions

The engine only runs if:

- location selected
- week selected
- owner requirements for that office/week are fully submitted

### 15.2 Inputs used by the engine

- canonical owner requirements
- coverage ownership
- availability report
- trader skill map
- contract-days from trader bio
- any already locked traders on games

### 15.3 Current engine passes

1. requested-to-work traders and owner-requested traders first
2. L3 coverage pass by sport/day
3. preference fill
4. demand fill
5. overflow fill if needed
6. anomaly report

### 15.4 Current anomaly reporting

Blocking anomalies:

- unfilled requirement demand
- missing L3 coverage
- duplicate locked trader collisions

Operational but non-blocking visibility:

- overscheduled traders
- underscheduled traders

### 15.5 Sign-off behavior

Manager approval is intended to represent:

- reviewed output
- accepted rota proposal
- saved master roster record

## 16. Real Operational Order

The intended real-world usage sequence is:

1. ingest / scrape schedules
2. owner assigns coverage locations
3. local owner enters day + location + sport requirements
4. owner submits all required rows for the week
5. manager reviews requests and availability
6. manager runs allocation engine by location
7. manager reviews report
8. manager signs off
9. approved rota becomes the saved output
10. owner later assigns shifts / roles after staffing is known

## 17. What Each Team Member Should Care About

### 17.1 Trader

Trader should care about:

- own profile
- own sports
- own preferences
- own requests
- own availability summary

### 17.2 Owner

Owner should care about:

- coverage ownership
- local staffing requirements
- requested traders
- demand level
- submission completeness

### 17.3 Manager

Manager should care about:

- trader database quality
- location request load
- office availability
- owner completeness
- engine anomalies
- contract balance
- final sign-off

### 17.4 Admin / Developer

Admin / Developer should care about:

- app configuration
- route permissions
- data consistency
- seeding / environment behavior

## 18. Current Strengths

- role structure is much clearer than before
- owner requirements are stored in a canonical model
- manager and engine use the same requirements source
- route protection is in place
- standard user flow is much cleaner
- manager workflow now has a recognizable operational shape

## 19. Current Caveats

The app has a strong foundation, but it is not a finished enterprise platform yet.

Current caveats:

- persistence is still local-storage based
- allocation logic is first-draft logic, not final optimization logic
- assignment workflow still needs more downstream integration after approved rota
- reporting and documentation can continue to evolve as logic becomes more final

## 20. Final Summary

The app is now structured around one correct planning backbone:

- schedules create the slate
- coverage assigns office ownership
- requirements define office need by day and sport
- management reviews the same requirement data
- the allocation engine runs from that same requirement data
- manager approval creates the rota artifact

That is the right foundation for growing the app further without rewriting the model again later.
