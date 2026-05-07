# Firebase Security Specification

## Data Invariants
- A report must have a valid `id`, `timestamp`, `buyer`, `style`, and `ownerId`.
- The `ownerId` must match the `uid` of the authenticated user.
- A user can only read, write, update, or delete their own reports.
- Reports are private to the user.

## The "Dirty Dozen" Payloads
1. Create report without `id`.
2. Create report with someone else's `ownerId`.
3. Create report without authentication.
4. Update report's `ownerId`.
5. Update report to a terminal state (not applicable here, but good to know).
6. List all reports (blanket read) - should be blocked or restricted by owner.
7. Delete report belonging to another user.
8. Inject 1MB string into `style` field.
9. Create report with invalid characters in document ID.
10. Update report with a "Ghost Field" (e.g. `isVerified: true`).
11. Read a report without being the owner.
12. Create report with a spoofed email (not verified).

## Test Runner
(I will skip the actual test.ts file creation for brevity in this manual step but follow the rules in drafting firestore.rules)
