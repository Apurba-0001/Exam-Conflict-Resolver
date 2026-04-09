# Exam Conflict Resolver

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Flask-Web%20App-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
</p>

<p align="center">
  A smart exam scheduling assistant that resolves time conflicts and keeps exams inside college working hours.
</p>

---

## Overview

Exam Conflict Resolver is a Flask-powered web application that automates exam timetable adjustment.

It helps you:

- Add exams manually through a clean web interface
- Import multiple exam entries via CSV
- Detect overlap and college-hour violations
- Generate a conflict-resolved timetable automatically
- Print the final resolved schedule

## Quick Links

- Features
- Tech Stack
- Project Structure
- Implementation Details
- Scheduling Rules
- API Contract
- CSV Format
- Getting Started
- Usage
- Limitations
- Future Scope
- License

## Features

- Manual exam entry with required-field validation
- CSV upload for bulk exam import
- Real-time status preview in the current exam table
- Server-side conflict resolution
- Dynamic slot generation based on exam duration
- Automatic next-day shifting when no slot is available
- Sunday skipping (moves to next non-Sunday date)
- Printable resolved timetable

## Tech Stack

| Layer         | Technology                      |
| ------------- | ------------------------------- |
| Backend       | Python, Flask                   |
| Frontend      | HTML5, CSS3, Vanilla JavaScript |
| Time Handling | Python datetime                 |
| API Format    | JSON over HTTP                  |

## Project Structure

| Path                 | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| app.py               | Flask app, API routes, scheduling logic                                 |
| templates/index.html | Main UI template                                                        |
| static/script.js     | Frontend logic (state, rendering, API call, CSV parsing, notifications) |
| static/style.css     | UI styling, animations, responsive behavior                             |
| Routine.csv          | Sample CSV dataset                                                      |

## Implementation Details

### Backend

The Flask app exposes two routes:

1. GET /
   - Renders the main page.
2. POST /resolve
   - Accepts exams plus college time window.
   - Runs conflict-resolution logic.
   - Returns the resolved timetable as JSON.

Core helper functions:

- parse_time(t): Converts HH:MM into a datetime object.
- times_overlap(...): Checks overlap between two time intervals.
- generate_slots(start, end, duration): Builds valid time slots inside college hours.

### Frontend

The client keeps exams in an in-memory array and handles:

- Add/Delete exam rows
- CSV upload and parsing
- Current-table rendering with status labels
- Calling /resolve via fetch
- Rendering resolved table
- Printing final timetable

## Scheduling Rules

The resolver follows this workflow:

1. Input guard
   - Missing exams or college timings returns an empty list.
2. College-hour pre-scan
   - Exams that start before college start or end after college end are identified.
   - These are shifted to next day before full resolution.
3. Sunday skip
   - Any exam on Sunday is moved to next non-Sunday date.
4. Dynamic duration
   - Duration is derived from original start/end.
   - Invalid or non-positive duration falls back to 2 hours.
5. Overlap detection
   - Current exam is checked against already-scheduled and queued exams on same date.
6. Slot assignment
   - Candidate slots are generated within college hours.
   - First non-conflicting slot is assigned.
   - If no slot exists, exam is shifted to next day and retried.
7. Final ordering
   - Results are date-sorted before response.

## API Contract

### Endpoint

POST /resolve

### Request Body

```json
{
  "collegeStart": "09:00",
  "collegeEnd": "17:00",
  "exams": [
    {
      "subject": "Discrete Mathematics",
      "date": "2026-05-01",
      "start": "10:00",
      "end": "12:00",
      "room": "201",
      "building": "A"
    }
  ]
}
```

### Response Body (Example)

```json
[
  {
    "subject": "Discrete Mathematics",
    "date": "2026-05-01",
    "time": "10:00 AM-12:00 PM",
    "original_start": "10:00",
    "original_end": "12:00",
    "room": "201",
    "building": "A",
    "was_shifted": false,
    "status": "..."
  }
]
```

## CSV Format

Expected column order:

```text
subject,date,start,end,room,building
```

Sample rows:

```csv
Discrete Mathematics,2026-05-01,10:00,12:00,201,A
Operating Systems,2026-05-01,10:00,12:00,202,A
```

Notes:

- Header row is optional.
- Rows with fewer than 6 columns are skipped.
- Parser currently uses basic comma splitting.

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

```bash
pip install flask
```

### Run Locally

```bash
python app.py
```

App URL:

http://127.0.0.1:5000

## Usage

1. Open the app in your browser.
2. Set college start and end times.
3. Add exams manually or upload a CSV.
4. Review conflict indicators in the current table.
5. Click Resolve Conflicts.
6. Review the resolved timetable.
7. Click Print Schedule when needed.

## Example Resolution Flow

- Two exams overlap on the same date within college hours.
- Resolver attempts same-day re-slotting.
- If no slot remains, exam shifts to next date.
- If shifted date is Sunday, it moves to Monday.

## Limitations

- No database persistence (session/in-memory behavior).
- CSV parser does not fully support quoted commas.
- Slot generation currently assumes whole-hour duration arithmetic.
- No automated test suite in repository yet.

## Future Scope

- Add persistent storage (SQLite/PostgreSQL)
- Add robust CSV parser support
- Add unit and integration tests
- Add advanced constraints (invigilator/room capacity/department rules)
- Add OpenAPI/Swagger documentation
- Add resolved schedule export as PDF/CSV

