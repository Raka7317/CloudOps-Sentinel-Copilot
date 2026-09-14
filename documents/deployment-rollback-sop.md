# Production Deployment Rollback SOP

A rollback is appropriate when a newly deployed version is strongly correlated with a customer-impacting regression and recovery through a safe configuration change is not faster.

## Pre-rollback checks
- Confirm the currently deployed image/version and the last known healthy version.
- Capture relevant application logs, Kubernetes events, and dashboard screenshots.
- Announce the rollback in the incident channel.
- Verify that database migrations are backward-compatible before rolling back application code.

## Rollback
Use the deployment platform's approved rollback action to restore the last known healthy application image. Do not manually edit production containers.

After rollback, verify readiness, error rate, latency, and at least one business-level health check. Keep the incident open until metrics remain stable for 15 minutes.


           PRODUCTION ISSUE
                  │
                  ▼
       New deployment caused it?
                  │
                  ▼
        Is rollback appropriate?
                  │
                  ▼
        ┌─────────────────────┐
        │   PRE-ROLLBACK      │
        │                     │
        │ 1. Confirm versions │
        │ 2. Save logs        │
        │ 3. Save events      │
        │ 4. Announce rollback│
        │ 5. Check DB schema  │
        └──────────┬──────────┘
                   │
                   ▼
             ROLLBACK
                   │
                   ▼
       Restore healthy version
                   │
                   ▼
        ┌─────────────────────┐
        │   POST-ROLLBACK     │
        │                     │
        │ Readiness     ✅    │
        │ Error rate    ✅    │
        │ Latency       ✅    │
        │ Business test ✅    │
        └──────────┬──────────┘
                   │
                   ▼
          Stable for 15 min?
             /          \
           YES           NO
            │             │
            ▼             ▼
     Close incident    Continue
                       diagnosis