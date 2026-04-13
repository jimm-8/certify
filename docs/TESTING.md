# Testing Documentation

Date prepared: April 12, 2026

## Scope
This document describes the internal (developer) unit testing setup for the Certify system frontend. The focus is on validating UI behavior and core logic of the following modules:

- Request tracking pages: checking, tracker, ready-for-release
- Cashier payment tagging page
- Request modal interactions (approval, rejection, and course/grade selection)

## Testing Tools
The frontend unit tests are implemented with:

- Vitest (test runner)
- React Testing Library (component rendering and user interaction)
- @testing-library/jest-dom (DOM assertions)
- jsdom (browser-like DOM environment)

## How To Run
From the project root:

```bash
npm.cmd --prefix frontend run test:run
```

To run only integration tests:

```bash
npm.cmd --prefix frontend run test:integration
```

For watch mode during development:

```bash
npm.cmd --prefix frontend run test
```

To generate the labeled test report used in documentation:

```bash
npm.cmd --prefix frontend run test:report
```

To print a table summary in the terminal:

```bash
npm.cmd --prefix frontend run test:table
```

Note: This command runs both Vitest and Playwright to populate the table and prints the following columns:

- Test Case
- Type (Unit / Integration / E2E)
- Description
- Expected Result
- Status

To run end-to-end tests (Playwright):

```bash
npm.cmd --prefix frontend run test:e2e
```

If Playwright browsers are not installed yet, run:

```bash
cd frontend
npx playwright install
```

## Test Strategy
The unit tests are designed to validate:

- Empty state rendering for each page
- UI actions that depend on API calls (mocked)
- Conditional enabling or disabling of buttons
- Modal interactions and validation-driven messaging

External services are mocked to keep tests deterministic and fast.

## Implemented Unit Tests

- File: `frontend/src/pages/certify/__tests__/checking.test.jsx` - Verifies empty state when no approved requests exist. Verifies bulk processing moves approved requests to Processing.
- File: `frontend/src/pages/certify/__tests__/tracker.test.jsx` - Verifies empty state when no requests exist. Verifies status update from Approved to Processing.
- File: `frontend/src/pages/certify/__tests__/ready.test.jsx` - Verifies empty state when no requests are ready for releasing. Verifies ready email action is triggered when wet signature is enabled. Verifies marking request as Released after email sent. Verifies certificate preview triggers download.
- File: `frontend/src/pages/certify/cashier/__tests__/payment.test.jsx` - Verifies empty state when no requests exist.
- File: `frontend/src/components/common/__tests__/requestModal.test.jsx` - Renders null when no request is provided. Inserts suggested decline note from validation flags. Requires course selection before approving course description requests. Sends rejection email when request is already rejected.

## Implemented Integration Tests

- File: `frontend/src/test/integration/processing-flow.test.jsx` - Request approval to Processing. Processing to For Releasing.
- File: `frontend/src/test/integration/payment-flow.test.jsx` - Payment tagging records payment and marks request paid.
- File: `frontend/src/test/integration/release-flow.test.jsx` - Release action updates status to Released.

## Implemented E2E Tests

- File: `frontend/e2e/flow.spec.js` - Full workflow: approve, process, pay, send ready email, release.

## Notes For Documentation
- Unit tests focus on UI behavior and interaction logic; API calls are mocked.
- The tests serve as internal verification before user testing.
- This setup can be extended with integration tests and end-to-end flows later.
- E2E testing uses a mock token and mocked API routes to avoid real backend dependencies.

## Test Evidence
A successful test run produces output similar to:

- Test files: 8
- Tests: 17
- Status: PASS

These outputs can be captured and included in an appendix if required.
