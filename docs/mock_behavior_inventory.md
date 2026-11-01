# Mock Behavior Inventory

This document identifies all mock behaviors, placeholder implementations, stub functions, disabled features, and temporary workarounds in the Seka Kama codebase that require functional implementation before production deployment.

## Summary

**Total Findings:** 17  
**Blocking:** 4  
**Important:** 9  
**Nice-to-have:** 4

---

## Inventory

| File:Line | Context | Estimated Complexity | Priority |
|-----------|---------|---------------------|----------|
| backend/api/routes.py:408-423 | Scenario simulation endpoint returns HTTP 503 - completely disabled due to missing model provenance, target units, training ranges, and validated feature allow-list | High | Blocking |
| backend/config/scenario_features.yaml:3 | Feature flag `enabled: false` - scenario modifications disabled until model bundle includes verified units, training ranges, and sensitivity evidence | High | Blocking |
| backend/core/config.py:112 | Feature flag `FEATURE_SCENARIO_SIMULATION_ENABLED` defaults to false - requires environment variable override to enable scenario simulation | Low | Blocking |
| backend/core/config.py:114 | Feature flag `FEATURE_REAL_TIME_UPDATES_ENABLED` defaults to false - real-time WebSocket or SSE updates for live dashboard not implemented | Medium | Important |
| backend/core/rate_limiting.py:14-16 | In-memory fallback rate limiter not suitable for multi-instance deployments - requires Redis backend for production distributed rate limiting | Medium | Blocking |
| backend/core/auth.py:36-37 | Development fallback JWT secret key "dev-only-secret-do-not-use-in-production-replace-me" - insecure default when JWT_SECRET_KEY env var not set | Low | Blocking |
| backend/api/routes.py:1047-1048 | Silent exception handling `except Exception: pass` when reading model_version - swallows errors without logging | Low | Important |
| backend/api/routes.py:1177-1178 | Silent exception handling `except: pass` when updating contact submission status after email sent - DB update failures not logged | Low | Important |
| backend/api/routes.py:1212-1213 | Silent exception handling `except: pass` when updating contact submission status after SendGrid email sent - DB update failures not logged | Low | Important |
| backend/api/routes.py:1248-1249 | Silent exception handling `except: pass` when updating contact submission status after webhook sent - DB update failures not logged | Low | Important |
| backend/api/routes.py:1180-1182 | Gmail SMTP partially configured fallback - logs warning but allows submission to proceed without email delivery | Low | Important |
| backend/api/routes.py:1187-1222 | SendGrid fallback email implementation - requires optional dependency `sendgrid==6.11.0` not in core requirements | Low | Nice-to-have |
| backend/api/routes.py:1224-1252 | Webhook fallback for contact form (n8n/Zapier/Make) - requires CONTACT_WEBHOOK_URL env var, no validation of webhook response | Low | Nice-to-have |
| backend/api/auth_routes.py:339-341 | SMTP not configured fallback in password reset - returns False but does not raise exception, allowing silent failure | Low | Important |
| backend/services/ecological_data_service.py:320-356 | NASA POWER API error handling returns empty dict `{}` on timeout, rate limit, or error - cells proceed without rainfall enrichment | Medium | Important |
| backend/services/performanceService.ts:491-493 | Frontend performance metrics flush to localStorage for development - no backend endpoint implemented for production metric collection | Medium | Nice-to-have |
| backend/services/feedbackService.ts:506-508 | Frontend feedback service flush to localStorage for development - no backend endpoint implemented for production feedback aggregation | Medium | Nice-to-have |

---

## Detailed Findings

### 1. Scenario Simulation Completely Disabled (Blocking)

**Location:** `backend/api/routes.py:408-423`, `backend/config/scenario_features.yaml:3`

**Context:** The core scenario simulation endpoint (POST /api/scenario) returns HTTP 503 with message "Scenario simulation is temporarily disabled: model target units, training ranges, and a validated feature allow-list are unavailable." The feature flag in `scenario_features.yaml` is set to `enabled: false` with explicit reason citing missing model provenance.

**Implementation Required:**
- Document model target units (predictions represent what: lion count, density index, relative score?)
- Provide training data ranges for all 43 features to validate user modifications
- Create feature allow-list with sensitivity evidence
- Update model bundle with provenance metadata
- Enable feature flag and remove HTTP 503 guard

**Complexity:** High - requires model documentation, training data analysis, validation framework  
**Priority:** Blocking - core platform functionality unavailable

---

### 2. Real-Time Updates Not Implemented (Important)

**Location:** `backend/core/config.py:114`

**Context:** Feature flag `FEATURE_REAL_TIME_UPDATES_ENABLED` defaults to false. Real-time WebSocket or Server-Sent Events for live dashboard updates (e.g., scenario processing status, collaborative sessions) not implemented.

**Implementation Required:**
- Choose WebSocket framework (e.g., FastAPI WebSocket support) or SSE
- Implement connection management and authentication
- Create event broadcasting for scenario status updates
- Add frontend WebSocket client integration
- Enable feature flag

**Complexity:** Medium - requires WebSocket infrastructure and event pipeline  
**Priority:** Important - enhances UX but not required for MVP

---

### 3. In-Memory Rate Limiter Not Production-Ready (Blocking)

**Location:** `backend/core/rate_limiting.py:14-16`

**Context:** Rate limiting uses in-memory dictionary `_memory_store` with comment "not suitable for multi-instance deployments". Production deployment with multiple API instances (load balancing, horizontal scaling) will have inconsistent rate limit enforcement per instance.

**Implementation Required:**
- Install Redis client library
- Configure Redis connection via environment variables
- Replace `_memory_store` dict with Redis sliding window implementation
- Add Redis health check to startup
- Test rate limiting across multiple API instances

**Complexity:** Medium - requires Redis infrastructure and connection pooling  
**Priority:** Blocking - critical for production security and fair resource allocation

---

### 4. Development JWT Secret Fallback (Blocking)

**Location:** `backend/core/auth.py:36-37`

**Context:** When `JWT_SECRET_KEY` environment variable is not set, falls back to hardcoded value "dev-only-secret-do-not-use-in-production-replace-me". While this raises RuntimeError in production mode, the check relies on environment detection which can be bypassed.

**Implementation Required:**
- Remove fallback entirely - always require JWT_SECRET_KEY
- Fail startup immediately if JWT_SECRET_KEY missing or less than 32 characters
- Add deployment checklist item to generate and set secure random secret
- Document secret generation command in deployment docs

**Complexity:** Low - configuration enforcement only  
**Priority:** Blocking - authentication security fundamental

---

### 5. Silent Exception Handling Without Logging (Important)

**Locations:** 
- `backend/api/routes.py:1047-1048` (model version read)
- `backend/api/routes.py:1177-1178` (contact submission status update)
- `backend/api/routes.py:1212-1213` (SendGrid status update)
- `backend/api/routes.py:1248-1249` (webhook status update)

**Context:** Multiple `except: pass` and `except Exception: pass` blocks silently swallow errors without logging. Failures become invisible, making debugging and monitoring impossible.

**Implementation Required:**
- Replace all `except: pass` with explicit exception types
- Log all exceptions at appropriate level (warning for recoverable, error for failures)
- Add structured logging with context (user_id, scenario_id, etc.)
- Consider adding exception metrics for monitoring

**Complexity:** Low - add logging statements, specify exception types  
**Priority:** Important - critical for production observability

---

### 6. Contact Form Email Fallback Chain (Important/Nice-to-have)

**Locations:**
- `backend/api/routes.py:1180-1182` (SMTP partial config)
- `backend/api/routes.py:1187-1222` (SendGrid fallback)
- `backend/api/routes.py:1224-1252` (Webhook fallback)

**Context:** Contact form has three-tier fallback: Gmail SMTP → SendGrid → Webhook. Partial configuration logs warning but allows submission without guaranteed delivery. SendGrid requires optional dependency not in core requirements. Webhook fallback has no response validation.

**Implementation Required:**
- Make email delivery required - fail submission if no email method configured
- Add SendGrid dependency to production requirements if used as fallback
- Validate webhook response status and retry on failure
- Add email delivery status to contact_submissions table
- Implement admin notification for failed deliveries

**Complexity:** Low - configuration validation and error handling  
**Priority:** Important (SMTP), Nice-to-have (SendGrid/Webhook as optional fallbacks)

---

### 7. NASA POWER API Degraded Mode (Important)

**Location:** `backend/services/ecological_data_service.py:320-356`

**Context:** NASA POWER API error handling returns empty dict `{}` on timeout, rate limit (429), or any error. Cells proceed to prediction without rainfall enrichment. Degraded mode is logged but prediction proceeds with potentially stale or missing data.

**Implementation Required:**
- Distinguish between transient (retry) and permanent (fallback) errors
- Implement exponential backoff for rate limits and timeouts
- Add cached rainfall data fallback from previous successful fetch
- Raise exception if rainfall data critical for prediction accuracy
- Add data quality flag to prediction response indicating degraded inputs

**Complexity:** Medium - requires retry logic, caching layer, data quality tracking  
**Priority:** Important - affects prediction accuracy and scientific validity

---

### 8. Frontend Metrics Stored Locally (Nice-to-have)

**Locations:**
- `web-app/seka_kama/services/performanceService.ts:491-493`
- `web-app/seka_kama/services/feedbackService.ts:506-508`

**Context:** Performance metrics and feedback batch flushes store to localStorage with comment "Store locally for development". No backend endpoint exists for production metric collection and aggregation.

**Implementation Required:**
- Create backend endpoints: POST /api/metrics/performance and POST /api/feedback/batch
- Add database tables for metrics storage (or use analytics service like PostHog, Mixpanel)
- Implement frontend retry logic with backoff for failed metric sends
- Add metrics dashboard for product/engineering teams
- Remove localStorage fallback in production

**Complexity:** Medium - requires backend endpoints, storage, dashboard  
**Priority:** Nice-to-have - observability enhancement, not core functionality

---

## Recommendations

### Immediate Actions (Before Production)

1. **Enable Scenario Simulation:** Complete model provenance documentation and enable scenario endpoint (Finding 1)
2. **Replace In-Memory Rate Limiter:** Deploy Redis and implement distributed rate limiting (Finding 3)
3. **Remove JWT Secret Fallback:** Require JWT_SECRET_KEY in all environments (Finding 4)
4. **Add Exception Logging:** Replace all silent exception handlers with logging (Finding 5)

### High Priority (Production Hardening)

5. **Email Delivery Validation:** Ensure contact form fails gracefully when email unconfigured (Finding 6)
6. **NASA POWER Retry Logic:** Implement exponential backoff and cached fallback (Finding 7)
7. **Real-Time Updates:** Implement WebSocket infrastructure for live status updates (Finding 2)

### Enhancements (Post-MVP)

8. **Metrics Backend:** Create backend endpoints for performance and feedback data (Finding 8)
9. **Multi-Channel Contact:** Fully implement SendGrid and webhook fallbacks with validation (Finding 6)

---

## Validation Checklist

- [ ] All HTTP 503 responses removed from core endpoints
- [ ] All feature flags default to `true` or removed
- [ ] No in-memory stores used for shared state in multi-instance deployment
- [ ] No hardcoded secrets or fallback credentials
- [ ] All exceptions logged with context
- [ ] All external API failures have retry logic or validated fallbacks
- [ ] All user-facing features fully functional without degraded modes

---

**Report Generated:** Phase 1 Audit  
**Audit Scope:** Mock behaviors, placeholder implementations, disabled features, temporary workarounds  
**Next Steps:** Prioritize blocking findings for immediate remediation before production deployment
