# OPD Token Allocation Engine

This is a backend system that manages OPD token allocation for a hospital.  
It is designed to handle real situations like walk-ins, emergencies, cancellations, no-shows, and doctor delays in a clean and fair way.

The main focus of this project is **backend logic and algorithm design**, not UI or infrastructure.

---

## Overview

In a hospital OPD:

- Doctors work in fixed time slots (9–10, 10–11, etc.)
- Each slot has a maximum capacity
- Patients arrive in different ways:
  - Online booking
  - Walk-in
  - Paid priority (VIP)
  - Follow-up
  - Emergency

Things don’t always go as planned:

- Doctors get delayed
- Patients cancel or don’t show up
- Emergencies arrive suddenly

This system handles all of that **without breaking slot limits or losing fairness**.

---

## What This System Supports

- Priority-based token allocation  
- Hard slot capacity enforcement  
- Emergency insertion with controlled overflow  
- Waitlist management with auto-promotion  
- Cancellation and no-show handling  
- Doctor delay handling using elastic capacity  
- Slot redistribution when needed  
- Full OPD day simulation  

---

## Quick Start

npm install
npm run dev
npm run simulate

## Server

Server runs at:  
**http://localhost:3000**

---

## How the System Works (High Level)

1. API receives a request  
   *(create token, cancel, no-show, etc.)*
2. Request goes to the **route layer**
3. Core logic decides what to do:
   - Allocate
   - Waitlist
   - Bump
   - Overflow
4. In-memory store is updated
5. Response is sent back

**Simulation uses the same logic**, not separate code.

---

## Patient Priority Order

1. **EMERGENCY** – Always allocated (can overflow)
2. **PAID_PRIORITY** – Can bump walk-ins
3. **FOLLOW_UP** – High priority, no bumping
4. **ONLINE_BOOKING** – Pre-booked
5. **WALK_IN** – First come, first served

---

## Doctor Delay Handling (Elastic Capacity)

If a doctor is running late:

- Affected slots are marked as delayed
- System calculates how many patients are impacted
- Adjacent slots may be merged
- Capacity is recalculated
- Patients are redistributed safely
- No patient is silently cancelled

This models how real hospitals adjust schedules instead of rigidly failing.

---

## API Summary

### Token APIs

- `POST /api/tokens` – Create token  
- `POST /api/tokens/emergency` – Emergency token  
- `DELETE /api/tokens/:id` – Cancel token  
- `POST /api/tokens/:id/no-show` – Mark no-show  
- `POST /api/tokens/:id/complete` – Mark completed  
- `GET /api/tokens` – List all tokens  

### System / Admin APIs

- `POST /api/system/doctor-delay` – Handle doctor delay  
- `POST /api/system/redistribute-slot` – Redistribute patients  
- `GET /api/system/overview` – System state  

### Info APIs

- `GET /api/doctors`  
- `GET /api/slots`  

Full API details are in `docs/API.md`.

---

## Project Structure Explained (Important)

### `src/app.ts`

- Creates Express app
- Registers middleware
- Registers routes
- **Does NOT start the server**

**Purpose:** App configuration

---

### `src/server.ts`

- Starts the server
- Listens on port

**Purpose:** Entry point

---

##  Routes Layer

### `src/routes/token.routes.ts`

- Handles token-related API endpoints
- Validates input
- Calls core allocation logic

**Purpose:** API → business logic bridge

---

### `src/routes/system.routes.ts`

- System-level APIs
- Doctor delay handling
- Slot redistribution
- Analytics endpoints

**Purpose:** Admin and system operations

---

## Core Business Logic (Main Part)

### `src/core/tokenAllocator.ts`

- Main allocation algorithm
- Handles:
  - Priority
  - Capacity check
  - Bumping
  - Waitlist
  - Emergency overflow

**Purpose:** Decision maker of the system

---

### `src/core/slotManager.ts`

- Adds/removes tokens from slots
- Manages waitlists
- Promotes patients

**Purpose:** Slot-level operations

---

### `src/core/priorityRules.ts`

- Defines priority scores
- Defines who can bump whom
- Defines bump limits

**Purpose:** Keeps rules separate and clean

---

### `src/core/delayHandler.ts`

- Handles doctor delays
- Calculates affected slots
- Suggests merging or redistribution

**Purpose:** Elastic capacity logic

---

## Data Layer

### `src/store/memoryStore.ts`

In-memory storage for:
- Doctors
- Slots
- Tokens
- Waitlists

**Purpose:** Simple state management for assignment

---

### `src/store/seedData.ts`

- Initial doctors and slots
- Used by simulation and local testing

**Purpose:** Consistent starting data

---

## Types & Utilities

### `src/types/`

- Domain models
- Enums (`PatientType`, `TokenStatus`, etc.)

**Purpose:** Type safety and clarity

---

### `src/validators/`

- Zod schemas
- Input validation

**Purpose:** Prevent invalid data entering system

---

### `src/utils/logger.ts`

- Central logging (info, warn, error)

**Purpose:** Debugging and simulation clarity

---

### `src/utils/timeHelpers.ts`

- Time checks
- Slot time validation

**Purpose:** Prevent allocation to past slots

---

##  Simulation

### `simulation/opdDay.ts`

Runs a full OPD day covering:
- All patient types
- Emergencies
- Cancellations
- No-shows
- Doctor delays
- Slot redistribution
- Final analytics

**Purpose:** Prove system works in real conditions

---

## Edge Cases Handled

- Multiple emergencies
- Cascade cancellations
- No-shows
- Doctor delays
- Slot cancellation
- Past time slots
- Full system waitlisting

---

##  Design Decisions

### In-Memory Store

- Keeps focus on logic, not infrastructure
- Fast and easy to review
- Acceptable for assignment scope

### Emergency Overflow

- Emergencies are never rejected
- Overflow is tracked and visible

### Limited Bumping

- Paid priority can bump walk-ins
- Bump limit prevents unfairness

---

##  Future Improvements

- Database persistence
- Redis-based waitlists
- Notifications (SMS / WhatsApp)
- Real-time dashboards
- Multi-hospital support
- No-show prediction

---

##  Documentation

- `docs/ALGORITHM.md` – Algorithm explanation  
- `docs/API.md` – API reference  
- `simulation/opdDay.ts` – Real-world scenarios  

