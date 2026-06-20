## 2026-06-25 - [Remove Hardcoded API Key]
**Vulnerability:** A hardcoded API key ("dev-api-key-123") was embedded in the default fallback configuration in `apps/web/src/lib/api/config.ts`.
**Learning:** Development defaults often introduce critical security vulnerabilities if they're checked into version control. Any fallback for sensitive tokens must either be empty or cause the system to fail securely to prevent accidental exposure in production builds.
**Prevention:** Always use environment variables for sensitive tokens (`process.env.NEXT_PUBLIC_API_KEY`) and avoid hardcoded default values entirely. Default values should be strictly empty strings or omitted.
