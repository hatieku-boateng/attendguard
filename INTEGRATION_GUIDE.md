# AttendGuard Reporting Integration Guide

This guide documents the preferred integration model for connecting AttendGuard to an existing PHP school management system.

## Integration Direction

AttendGuard should handle the attendance workflow:

- Administrator setup for faculties, departments, lecturers, courses, lecture halls, and students.
- Lecturer course management, student enrolment, rotating QR attendance sessions, reviews, approvals, and corrections.
- Student account activation and attendance submission.
- Official attendance record storage.

The PHP school management system should connect to AttendGuard only when it needs to pull reports.

```text
AttendGuard
  Attendance operations
  Rotating QR verification
  Reviews and approvals
  Official attendance records

        secure report API

PHP School Management System
  Pulls reports
  Displays or stores summaries
```

This keeps the integration simpler and avoids both systems trying to manage the same operational workflow.

## Security

All report requests must include the shared bearer token:

```http
Authorization: Bearer <INTEGRATION_API_SECRET>
X-Source-System: php_sis
```

`INTEGRATION_API_SECRET` is configured in Vercel and must not be committed to Git. `X-Source-System` is optional, but recommended for traceability.

Base URL:

```text
https://attendance-management-system-two-omega.vercel.app
```

## Primary Report Endpoints

### Full Attendance Report

`GET /api/integrations/reports/attendance`

Returns raw attendance records plus grouped summaries by course, student, and session.

Example:

```http
GET /api/integrations/reports/attendance?from=2026-06-01&to=2026-06-30
Authorization: Bearer <INTEGRATION_API_SECRET>
X-Source-System: php_sis
```

### Course Attendance Summary

`GET /api/integrations/reports/courses`

Returns attendance performance grouped by course.

Example:

```http
GET /api/integrations/reports/courses?courseCode=PUCIT307&from=2026-06-01&to=2026-06-30
Authorization: Bearer <INTEGRATION_API_SECRET>
```

### Student Attendance Summary

`GET /api/integrations/reports/students`

Returns attendance performance grouped by student.

Example:

```http
GET /api/integrations/reports/students?studentIdNumber=PUIT/260001
Authorization: Bearer <INTEGRATION_API_SECRET>
```

### Session Attendance Summary

`GET /api/integrations/reports/sessions`

Returns attendance performance grouped by class session.

Example:

```http
GET /api/integrations/reports/sessions?courseCode=PUCIT307
Authorization: Bearer <INTEGRATION_API_SECRET>
```

## Supported Filters

The report endpoints support these optional query parameters:

| Filter | Description |
| --- | --- |
| `from` | Start date, for example `2026-06-01` |
| `to` | End date, for example `2026-06-30` |
| `courseId` | AttendGuard course UUID |
| `courseCode` | Course code, for example `PUCIT307` |
| `courseExternalId` | External course ID, if one exists |
| `sessionId` | AttendGuard attendance session UUID |
| `studentIdNumber` | Official student ID number |
| `studentExternalId` | External student ID, if one exists |
| `lecturerExternalId` | External lecturer ID, if one exists |
| `lecturerEmail` | Lecturer email address |
| `programme` | Course programme name |
| `level` | Course level, for example `300` |
| `facultyCode` | Faculty code |
| `departmentCode` | Department code |

Filters can be combined.

Example:

```http
GET /api/integrations/reports/attendance?courseCode=PUCIT307&level=300&from=2026-06-01&to=2026-06-30
Authorization: Bearer <INTEGRATION_API_SECRET>
```

## Response Structure

The full attendance report returns this shape:

```json
{
  "sourceSystem": "php_sis",
  "reportType": "attendance",
  "filters": {
    "courseCode": "PUCIT307"
  },
  "generatedAt": "2026-06-21T07:30:00.000Z",
  "totals": {
    "records": 120,
    "present": 100,
    "late": 5,
    "manuallyPresent": 3,
    "excused": 2,
    "absent": 10,
    "credited": 108,
    "attendanceRate": 90
  },
  "records": [],
  "summaries": {
    "byCourse": [],
    "byStudent": [],
    "bySession": []
  }
}
```

Credited attendance includes:

- `present`
- `late`
- `manually_present`

Non-credited attendance includes:

- `absent`

`excused` is reported separately and is not counted as credited unless the institution later decides to change that policy.

## Legacy Compatibility Endpoint

This endpoint remains available for compatibility:

`GET /api/integrations/attendance/summary`

It now uses the same report engine as the new endpoints.

## Optional Sync Endpoints

AttendGuard can still receive data from the PHP system if the school later wants that. For the current preferred direction, these endpoints are optional and should not be used unless there is a deliberate data-governance decision to let PHP push official records into AttendGuard.

Optional sync endpoints:

- `POST /api/integrations/faculties`
- `POST /api/integrations/departments`
- `POST /api/integrations/lecturers`
- `POST /api/integrations/students`
- `POST /api/integrations/course-catalog`
- `POST /api/integrations/courses`
- `POST /api/integrations/enrolments`

Each sync endpoint accepts a single object, an array of objects, or `{ "items": [...] }`. Every synced record should include a stable `externalId`.

## Recommended PHP Developer Contract

Give the PHP developer:

- The production base URL.
- The shared bearer token.
- The report endpoints above.
- The filter list.
- The expected response format.

The PHP developer does not need to create lecturers, students, courses, or sessions inside AttendGuard for the report-only model.
