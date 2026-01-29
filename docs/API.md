# API Documentation – OPD Token Allocation System

## Base URL

http://localhost:3000/api


This document explains all the APIs exposed by the **OPD Token Allocation System**.  
The APIs are designed to be simple, predictable, and easy to test using **Postman**, **curl**, or **PowerShell**.

---

##  Health Check

### Check if service is running
**GET** `/health`

### Response
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T10:28:05.311Z"
}
```
##  Notes

- Used to verify server status  
- Timestamp is returned in **UTC (ISO format)**  

---

## API Overview

### Doctors
- `GET /doctors` – Get all doctors  
- `GET /doctors/:doctorId` – Get single doctor details  
- `GET /doctors/:doctorId/slots` – Get all slots for a doctor  

### Slots
- `GET /slots` – Get all slots  
- `GET /slots/:slotId` – Get slot details  
- `GET /slots/:slotId/availability` – Check slot capacity & waitlist  

### Tokens
- `POST /tokens` – Create a token  
- `POST /tokens/emergency` – Create emergency token  
- `GET /tokens` – Get all tokens  
- `GET /tokens/:tokenId` – Get token details  
- `DELETE /tokens/:tokenId` – Cancel token  
- `POST /tokens/:tokenId/no-show` – Mark patient as no-show  
- `POST /tokens/:tokenId/complete` – Mark consultation completed  

### Elastic Capacity / Admin
- `POST /slots/:slotId/delay` – Mark doctor delay  
- `POST /slots/:slotId/reallocate` – Redistribute affected patients  
- `GET /tokens/stats/summary` – OPD analytics summary  

---

##  Detailed API Reference

### Create Token
**POST** `/api/tokens`  
**Content-Type:** `application/json`

#### Request Body
```json
{
  "patientName": "John Doe",
  "patientType": "WALK_IN",
  "doctorId": "doc-1",
  "preferredSlotId": "slot-doc-1-0900"
}
```

## preferredSlotId is optional

If not provided, the system automatically selects the best available slot

- Patient Types
- EMERGENCY
- PAID_PRIORITY
- FOLLOW_UP
- ONLINE_BOOKING
- WALK_IN
Success Response
{
  "success": true,
  "message": "Token allocated successfully",
  "data": {
    "token": {
      "id": "uuid",
      "patientName": "John Doe",
      "patientType": "WALK_IN",
      "status": "ALLOCATED",
      "slotId": "slot-doc-1-0900"
    },
    "slot": {
      "currentLoad": 4,
      "maxCapacity": 10
    }
  }
}

Validation Error
{
  "success": false,
  "error": [
    {
      "path": ["patientName"],
      "message": "Invalid input: expected string"
    }
  ]
}

Create Emergency Token

POST /api/tokens/emergency
Content-Type: application/json

Request Body
{
  "patientName": "Emergency Patient",
  "doctorId": "doc-1",
  "severity": "critical"
}

## Behavior
- Emergency tokens are always allocated
- May create controlled overflow
- Tracked separately for analytics
- Cancel Token
- DELETE /api/tokens/:tokenId
- Content-Type: application/json

Optional Request Body
{
  "reason": "Patient requested cancellation"
}

## What Happens

- Token is cancelled
- Slot capacity is freed
- Top waitlisted patient (if any) is promoted automatically
- Mark No-Show
- POST /api/tokens/:tokenId/no-show
- Marks patient as NO_SHOW
- Frees slot
- Promotes from waitlist if available
- Mark Token Completed
- POST /api/tokens/:tokenId/complete
- Marks consultation as completed

## Used for analytics and OPD statistics

## Doctor APIs
- Get All Doctors
- GET /api/doctors

# Returns:

- Doctor ID
Name
Specialty
Working hours
Get Doctor Slots
GET /api/doctors/:doctorId/slots
Returns all slots with:
Time window
Capacity
Current load
Slot status

## Slot Availability

GET /api/slots/:slotId/availability

Response
{
  "slotId": "slot-doc-1-0900",
  "currentLoad": 6,
  "maxCapacity": 10,
  "waitlistCount": 2,
  "isOverflow": false
}

## Doctor Delay Handling (Elastic Capacity)
Mark Doctor Delay

POST /api/slots/:slotId/delay
Content-Type: application/json

Request Body
{
  "delayMinutes": 30
}

Behavior

Marks slot as delayed
Calculates affected patients

Suggests or applies slot merging

Ensures no patient is silently dropped

## Slot Reallocation

POST /api/slots/:slotId/reallocate

Used when:

Slot is cancelled

Doctor unavailable

Equipment failure

Patients are redistributed based on:

Priority

Slot availability

Fairness rules

## OPD Statistics Summary

GET /api/tokens/stats/summary

Returns:

Total patients

Completed / cancelled / no-shows

Emergency load

Slot utilization

Capacity efficiency

❗ Error Handling
Scenario	Response
Invalid input	400 + validation error
Doctor not found	404
Slot not found	404
Token not found	404
Invalid state change	409

All errors follow a consistent JSON structure.

## Notes

Authentication is not implemented (assignment scope)

In-memory store is used intentionally

APIs are stateless

Designed for easy DB-backed extension

## Final Note

These APIs are built to clearly demonstrate the allocation logic, fairness rules, and real-world OPD behavior, rather than focusing on heavy infrastructure.