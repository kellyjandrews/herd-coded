# Test report: Authenticate preview tests

- `npm run build` — passed.
- `npm run verify` — passed, including 71 unit tests.
- `BASE_URL=http://localhost:3112 FACTORY_BASIC_AUTH_USERNAME=preview-test FACTORY_BASIC_AUTH_PASSWORD=local-test-only npm run test:e2e -- tests/e2e/dashboard.spec.ts tests/e2e/smoke.spec.ts` — passed: 12 tests, 4 expected skips. The target was a locally running production build with mock providers and temporary test credentials.
- Manual HTTP checks against that build returned 401 without credentials, 200 with credentials, and 200 for public health.
- Preview workflow YAML parses. No Vercel deployment or GitHub Actions rerun was performed; the next preview run must confirm the remote deployment.
