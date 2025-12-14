# Interview Panel Auto-Assignment System

## Overview

The Interview Panel Auto-Assignment System automatically selects and assigns interviewers for job postings based on predefined criteria. When a job post is created or updated with interview schedules, the system automatically:

1. Selects 2 interviewers from the same department as the job post
2. Selects 1 interviewer from the HR department
3. Sends notifications to selected interviewers
4. Manages their accept/reject responses
5. Automatically finds replacements for rejected requests

## Database Schema

### New Tables

#### `interview_panel_assignment`
- Tracks interview panel assignments for job posts
- Links job posts to schedules and assignment types
- Manages assignment status (PENDING, COMPLETED, CANCELLED)

#### `interview_panel_request`
- Tracks individual interviewer requests
- Links assignments to company users and notifications
- Manages request status (PENDING, ACCEPTED, REJECTED)

#### `interview_panel_member`
- Tracks final interview panel members
- Links accepted interviewers to assignments
- Manages panel roles (INTERVIEWER, LEAD_INTERVIEWER)

## API Endpoints

### Interview Panel Management

#### `POST /api/v2/interview-panel/assign-interviewers/`
Manually assign interviewers for a job post.

**Request Body:**
```json
{
  "job_post_id": 1,
  "schedule_id": 1,
  "same_department_count": 2,
  "hr_department_count": 1
}
```

#### `POST /api/v2/interview-panel/respond-to-request/`
Respond to an interview panel request (accept/reject).

**Request Body:**
```json
{
  "request_id": 1,
  "status": "ACCEPTED"  // or "REJECTED"
}
```

#### `GET /api/v2/interview-panel/my-pending-requests/`
Get pending interview panel requests for the current user.

#### `GET /api/v2/interview-panel/panel-members/{job_post_id}/`
Get all panel members for a specific job post.

#### `GET /api/v2/interview-panel/assignments/{job_post_id}/`
Get all interview panel assignments for a job post.

#### `GET /api/v2/interview-panel/assignment/{assignment_id}/details/`
Get detailed information about a specific assignment.

#### `DELETE /api/v2/interview-panel/assignment/{assignment_id}/`
Cancel an interview panel assignment.

## Interviewer Selection Criteria

### Valid Ranks
Interviewers must have one of the following ranks:
- `senior_associate`
- `team_lead`
- `manager`
- `senior_manager`

### Selection Logic
1. **Same Department Interviewers (2 people):**
   - Same company as job post
   - Same department as job post
   - Valid rank
   - Not the job post creator

2. **HR Department Interviewers (1 person):**
   - Same company as job post
   - Department name contains "인사" (HR)
   - Valid rank

## Automatic Assignment Flow

### Job Post Creation
When a job post is created with interview schedules:

1. Interview schedules are saved to the `schedule` table
2. For each schedule, the system automatically:
   - Creates interview panel assignments
   - Selects interviewers based on criteria
   - Creates notifications for selected interviewers
   - Creates interview panel requests

### Job Post Update
When a job post is updated with new interview schedules:

1. Existing interview panel assignments are deleted
2. New assignments are created with updated schedules
3. New interviewers are selected and notified

## Frontend Integration

### MemberSchedule Component
The `MemberSchedule.jsx` component has been updated to:

1. Display interview panel requests separately from regular interview requests
2. Show request details including job post title, schedule date, and assignment type
3. Provide accept/reject buttons for each request
4. Handle response submission and local state updates

### Notification System
The notification system has been updated to:

1. Handle `INTERVIEW_PANEL_REQUEST` notification type
2. Navigate to MemberSchedule when clicked
3. Display appropriate messages for interview panel requests

## Usage Examples

### Creating a Job Post with Interview Schedules
```javascript
const jobPostData = {
  title: "Software Developer",
  department: "개발팀",
  // ... other fields
  interview_schedules: [
    {
      interview_date: "2024-02-15",
      interview_time: "14:00",
      location: "회사 본사 3층 회의실"
    }
  ]
};

// This will automatically trigger interview panel assignment
await api.post('/company/jobposts', jobPostData);
```

### Responding to Interview Request
```javascript
// Accept request
await interviewPanelApi.respondToRequest(requestId, 'ACCEPTED');

// Reject request
await interviewPanelApi.respondToRequest(requestId, 'REJECTED');
```

### Getting Pending Requests
```javascript
const pendingRequests = await interviewPanelApi.getMyPendingRequests();
```

## Error Handling

The system includes comprehensive error handling:

1. **Interviewer Selection Failures:** If no suitable interviewers are found, the system logs the error but doesn't prevent job post creation
2. **Notification Failures:** If notifications can't be created, the system continues with the assignment process
3. **Database Errors:** All database operations are wrapped in try-catch blocks with appropriate error messages

## Testing

Use the provided test script to verify the system:

```bash
python test_interview_panel.py
```

The test script will:
1. Create a test job post
2. Verify interview panel assignments were created
3. Check panel members
4. Test manual interviewer assignment

## Future Enhancements

Potential improvements for the system:

1. **Advanced Selection Criteria:** Add more sophisticated selection logic based on availability, expertise, etc.
2. **Bulk Operations:** Support for bulk interviewer assignment across multiple job posts
3. **Analytics:** Track assignment success rates and response times
4. **Integration:** Integrate with calendar systems for availability checking
5. **Notifications:** Add email/SMS notifications in addition to in-app notifications 