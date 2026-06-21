# AttendGuard School Management System Integration Guide

This guide documents the neutral integration layer that allows a PHP-based school management system or any trusted SIS to synchronize institutional data with AttendGuard.

## Security

All integration requests must include a shared bearer token:

```http
Authorization: Bearer <INTEGRATION_API_SECRET>
X-Source-System: php_sis
```

`INTEGRATION_API_SECRET` must be configured in the deployed environment before these endpoints can be used. `X-Source-System` is optional, but recommended. It lets AttendGuard keep records from different external systems distinct.

## Payload Shape

Each sync endpoint accepts any of these shapes:

```json
{ "externalId": "FAC-001", "name": "Faculty of Engineering", "code": "FOE" }
```

```json
[
  { "externalId": "FAC-001", "name": "Faculty of Engineering", "code": "FOE" }
]
```

```json
{
  "items": [
    { "externalId": "FAC-001", "name": "Faculty of Engineering", "code": "FOE" }
  ]
}
```

The response reports the number of records received, created, updated, skipped, and failed.

## Sync Endpoints

Base URL:

```text
https://attendance-management-system-two-omega.vercel.app
```

### Faculties

`POST /api/integrations/faculties`

Required fields: `externalId`, `name`, `code`

```json
{
  "externalId": "FAC-IT",
  "name": "Faculty of Information Technology",
  "code": "FIT",
  "description": "Information technology faculty",
  "status": "active"
}
```

### Departments

`POST /api/integrations/departments`

Required fields: `externalId`, `name`, `code`, plus either `facultyExternalId` or `facultyCode`

```json
{
  "externalId": "DEP-CS",
  "name": "Computer Science",
  "code": "CS",
  "facultyExternalId": "FAC-IT",
  "status": "active"
}
```

### Lecturers

`POST /api/integrations/lecturers`

Required fields: `externalId`, `name`, `email`

```json
{
  "externalId": "STAFF-1001",
  "name": "Jane Doe",
  "email": "jane.doe@example.edu",
  "staffId": "STAFF1001",
  "department": "Computer Science",
  "accountStatus": "active"
}
```

### Students

`POST /api/integrations/students`

Required fields: `externalId`, `name`, `email`, `studentIdNumber`

```json
{
  "externalId": "STU-2026-0001",
  "name": "Kwame Mensah",
  "email": "kwame.mensah@example.edu",
  "studentIdNumber": "PUIT/260001",
  "studentCategory": "regular",
  "programmeLevel": "undergraduate",
  "programme": "BSc Information Technology",
  "level": "300",
  "classGroup": "A",
  "facultyExternalId": "FAC-IT",
  "departmentExternalId": "DEP-CS",
  "accountStatus": "pending"
}
```

Students synchronized this way are created as pending accounts unless `accountStatus` is supplied. Activation emails remain controlled by the AttendGuard enrolment workflow.

### Course Catalog

`POST /api/integrations/course-catalog`

Required fields: `externalId`, `courseCode`, `courseTitle`

```json
{
  "externalId": "CAT-PUCIT307",
  "courseCode": "PUCIT307",
  "courseTitle": "Computer and Information Security",
  "programme": "BSc Information Technology",
  "level": "300",
  "facultyExternalId": "FAC-IT",
  "departmentExternalId": "DEP-CS",
  "status": "active"
}
```

### Course Offerings

`POST /api/integrations/courses`

Required fields: `externalId`, `courseCode`, `courseTitle`, `semester`, `academicYear`, and a lecturer reference.

Lecturer reference can be `lecturerExternalId`, `staffId`, or `lecturerEmail`.

```json
{
  "externalId": "OFFER-PUCIT307-2026-S1-A",
  "catalogExternalId": "CAT-PUCIT307",
  "courseCode": "PUCIT307",
  "courseTitle": "Computer and Information Security",
  "semester": "Semester 1",
  "academicYear": "2026/2027",
  "classGroup": "A",
  "lecturerExternalId": "STAFF-1001",
  "status": "active"
}
```

### Enrolments

`POST /api/integrations/enrolments`

Required fields: `externalId`, `courseExternalId`, `studentExternalId`

```json
{
  "externalId": "ENR-0001",
  "courseExternalId": "OFFER-PUCIT307-2026-S1-A",
  "studentExternalId": "STU-2026-0001",
  "status": "active"
}
```

## Attendance Export

`GET /api/integrations/attendance/summary`

Optional filters:

```text
courseExternalId=OFFER-PUCIT307-2026-S1-A
studentExternalId=STU-2026-0001
```

Example:

```http
GET /api/integrations/attendance/summary?courseExternalId=OFFER-PUCIT307-2026-S1-A
Authorization: Bearer <INTEGRATION_API_SECRET>
X-Source-System: php_sis
```

The response includes raw attendance records and a grouped summary with credited attendance rate. Present, late, and manually approved attendance are all credited.

## Integration Principles

- The PHP system should remain the source of truth for official institutional records such as faculties, departments, programme structure, official courses, staff, and students.
- AttendGuard should remain the source of truth for attendance sessions, GPS verification, attendance records, lecturer overrides, and review decisions.
- Every record sent from the PHP system should have a stable `externalId`.
- If a record changes in the PHP system, resend the same `externalId`; AttendGuard updates the matching local record.
- Do not reuse an `externalId` for a different person, course, or department.
