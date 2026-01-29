# OPD Token Allocation Algorithm

## Overview

This OPD Token Allocation Engine is built around a **priority-based dynamic allocation** approach that works in real time.

The main goal is to handle real hospital situations like **walk-ins, VIP patients, emergencies, cancellations, and delays** without breaking slot capacity rules.

The focus of the design is:
1. **Correctness first**
2. **Fairness**
3. **Flexibility**

---

## Core Algorithm Design

### 1. Priority Scoring System

Each patient type is assigned a **priority score**.  
Higher score means higher importance during allocation.

| Priority Level | Patient Type     | Score | Can Bump? |
|---------------|------------------|-------|-----------|
| 1 (Highest)   | EMERGENCY        | 100   | Anyone    |
| 2             | PAID_PRIORITY    | 80    | Walk-ins  |
| 3             | FOLLOW_UP        | 60    | None      |
| 4             | ONLINE_BOOKING   | 40    | None      |
| 5 (Lowest)    | WALK_IN          | 20    | None      |

**Real-world mapping:**
- Emergencies are always handled first  
- Paid priority patients can skip walk-ins  
- Follow-ups are important but not urgent  

---

### 2. Allocation Decision Flow

Whenever a new token request comes in, the system follows this flow:

New Token Request
|
├─ Slot has capacity?
| ├─ YES → Allocate immediately
| └─ NO → Continue
|
├─ Is Emergency?
| ├─ YES → Allocate with overflow
| └─ NO → Continue
|
├─ Is Paid Priority + Walk-in exists?
| ├─ YES → Bump walk-in, allocate
| └─ NO → Continue
|
└─ Add to waitlist (priority + time based)


This keeps the logic **predictable** and **easy to reason about**.

---

### 3. Bumping Rules

#### Who can bump whom:
- **Emergency**: Does not bump; creates overflow
- **Paid Priority**: Can bump walk-in patients
- **Others**: Cannot bump anyone

#### Fairness rules:
- A patient can be bumped **maximum 2 times**
- After that, they are **protected from further bumps**

#### Which patient gets bumped:
- **LIFO strategy**
- The most recently allocated walk-in is bumped first

This avoids punishing early arrivals repeatedly.

---

### 4. Waitlist Management

The waitlist is always sorted using:
1. **Priority score** (higher first)
2. **Token creation time** (earlier first)

#### Promotion triggers:
- Patient cancels
- Patient marked as no-show
- Slot becomes free after completion

#### Promotion process:
1. Pick top waitlisted patient
2. Assign freed slot
3. Update token status
4. (In real system: notify patient)

This makes waitlist promotion **fast and fair**.

---

### 5. Edge Case Handling

#### Multiple emergencies in the same slot
- **Handled by**: Allowing overflow  
- **Reason**: Emergencies must never be rejected  

#### Multiple cancellations at once
- **Handled by**: Sequential processing  
- **Why**: Prevents race conditions  

#### Slot already passed
- **Handled by**: Time validation before allocation  
- **Result**: Allocation rejected with next-slot suggestion  

#### Doctor unavailable suddenly
- **Handled by**: Closing affected slots  
- **Action**: Move patients to waitlist or reassign (future scope)

---

## Time Complexity

| Operation          | Complexity | Reason |
|-------------------|------------|--------|
| Allocate Token    | O(n)       | May need to check and bump |
| Cancel Token      | O(1)       | Direct lookup |
| Promote Waitlist  | O(1)       | Pre-sorted list |
| Sort Waitlist     | O(n log n) | After insertion |

> `n` = number of tokens in a slot

---

## Space Complexity

- **Per Slot**: `O(k)` (allocated + waitlist)
- **Overall**: `O(d × s × k)`

Where:
- `d` = doctors  
- `s` = slots  
- `k` = tokens  

---

## Design Trade-offs

### In-memory vs Database
- **Chosen**: In-memory (for assignment)
- **Why**:
  - Faster to evaluate
  - Easier to reason about
  - Keeps focus on algorithm

**Trade-off**:  
Data resets on restart (acceptable for assignment)

> Production: DB + Redis

---

### Bumping Allowed for Paid Priority
- Reflects real hospital monetization
- Revenue-oriented
- Controlled using bump limits
- Prevents abuse

---

### Emergency Overflow Instead of Rejection
- Medical ethics: emergencies must never wait
- Overflow tracked explicitly
- Realistic hospital behavior

---

### Follow-ups Cannot Bump
- Important but not urgent
- Maintains continuity of care
- Avoids unfair displacement
- Still prioritized in waitlist

---

## Scalability Notes

Current version supports:
- 3–10 doctors
- 20–100 slots
- Hundreds of patients/day

Production version would add:
- PostgreSQL for persistence
- Redis for fast access
- Message queues for notifications
- WebSockets for live dashboards
- Distributed locks for concurrency
- Multi-hospital support

---

## Performance Optimizations Used
- Pre-sorted waitlist
- O(1) token lookups
- Slot indexing by doctor
- Minimal recomputation on changes

---

## Testing Strategy
- Unit tests for allocation logic
- Integration tests for APIs
- Full-day simulation
- Edge case validation
- Stress scenarios

---

## Failure Handling

| Scenario            | Handling |
|---------------------|----------|
| Invalid input       | Validation error |
| Doctor not found    | Safe error response |
| Slot not found      | Suggest alternative |
| Token not found     | 404 response |
| Concurrent updates  | Controlled sequence |
| System restart      | Acceptable (in-memory) |

---

## Strengths of the Algorithm
- Fair and predictable
- Handles real hospital scenarios
- Easy to extend
- Efficient for daily OPD usage
- Clean separation of logic

---

## Possible Future Improvements
- Predict no-shows using data
- Smart slot optimization
- Cross-doctor redistribution
- Flexible appointment windows
- Preference-based doctor matching

---

## Final Note

This system was intentionally kept **simple at the infrastructure level** so the **core algorithm and decision-making logic** remains **clear, testable, and realistic**.
