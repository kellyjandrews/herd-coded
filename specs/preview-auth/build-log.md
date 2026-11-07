# Build log: Authenticate preview tests

- The failed preview report showed the dashboard returning “Factory Basic Auth is not configured.”
- The preview workflow now requires the existing GitHub Actions credentials and passes them to the preview deployment and its Playwright job.
- The smoke test reports failed dashboard HTTP responses and verifies that unauthenticated access is rejected.
- Documented preview credential configuration; production settings remain unchanged.
