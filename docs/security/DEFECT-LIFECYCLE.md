# Defect Lifecycle & Evidence Documentation

## Overview

This document demonstrates the complete lifecycle of a security defect using **GitHub Issues** as the tracking system, aligned with ISO/IEC 25010 quality management processes.

---

## Defect Lifecycle States

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌─────────────┐
│ Detected │───▶│ Registered│───▶│ Assigned │───▶│ In Progress │
└──────────┘    └───────────┘    └──────────┘    └──────┬──────┘
                                                        │
┌──────────┐    ┌───────────┐    ┌──────────┐          │
│  Closed  │◀───│ Retesting │◀───│  Fixed   │◀─────────┘
└──────────┘    └───────────┘    └──────────┘
```

---

## Example: SEC-001 — Reflected XSS in Ticket Search

### State 1: Detected 🔴

**Date**: 2026-05-20 09:15 UTC  
**Detector**: OWASP ZAP Baseline Scan (GitHub Actions)  
**Environment**: CI — PR #142  
**Trigger**: `git push` to branch `feature/ticket-search`

#### ZAP Alert Evidence

```json
{
  "alert": "Cross Site Scripting (Reflected)",
  "risk": "High",
  "confidence": "Medium",
  "url": "http://localhost:3000/tickets?query=%3Cscript%3Ealert(1)%3C/script%3E",
  "param": "query",
  "attack": "<script>alert(1)</script>",
  "evidence": "<span>Results for: <script>alert(1)</script></span>",
  "solution": "Sanitize user input before rendering in HTML context",
  "reference": "https://owasp.org/www-community/attacks/xss/",
  "cweid": "79",
  "wascid": "8"
}
```

#### CI Log Snippet

```
[ZAP Baseline Scan] ==========================
[ZAP Baseline Scan] FAIL-NEW: Cross Site Scripting (Reflected) [40012] x 2
[ZAP Baseline Scan] 	 http://localhost:3000/tickets?query=<script>alert(1)%3C/script%3E
[ZAP Baseline Scan] 	 http://localhost:3000/tickets?query=<img+src%3Dx+onerror%3Dalert(1)%3E
[ZAP Baseline Scan] FAIL-NEW: 2	FAIL-INPROG: 0	WARN-NEW: 1	WARN-INPROG: 0	INFO: 0	IGNORE: 0	PASS: 12
[ZAP Baseline Scan] Exiting with error value: 2
```

---

### State 2: Registered 📝

**GitHub Issue #243** created automatically by ZAP Action bot:

---

**Title**: `[SECURITY] High: Cross Site Scripting (Reflected) in /tickets`

**Labels**: `security`, `high`, `xss`, `frontend`, `dast`, `SEC-001`

**Assignees**: (awaiting triage)

**Body**:

```markdown
## ZAP Scan Alert

| Attribute | Value |
|-----------|-------|
| **Rule ID** | 40012 |
| **Risk** | High |
| **Confidence** | Medium |
| **CWE** | 79 |
| **WASC** | 8 |

### Description
The application reflects user input directly into the HTML response without proper sanitization, allowing attackers to execute arbitrary JavaScript in the context of the victim's browser.

### Affected URL
- `http://localhost:3000/tickets?query=<script>alert(1)%3C/script%3E`

### Evidence
```html
<span>Results for: <script>alert(1)</script></span>
```

### Solution
Implement output encoding or use a sanitization library (e.g., DOMPurify) before rendering user input in HTML contexts.

### References
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CWE-79](https://cwe.mitre.org/data/definitions/79.html)

### Evidence Attachment
- [zap-baseline-report.html](../actions/runs/123456/artifacts/zap-baseline-reports)

/cc @security-champion @frontend-lead
```

---

### State 3: Assigned 👤

**Comment by @qa-lead** (2026-05-20 10:30 UTC):

```markdown
## Triage Decision

After reviewing the ZAP evidence:

- **Confirmed**: This is a valid reflected XSS vulnerability
- **Impact**: High — can steal session cookies, perform actions on behalf of user
- **Affected Component**: `apps/web/src/components/TicketSearch.tsx`
- **Assigning to**: @frontend-lead for immediate fix
- **Sprint**: Sprint 14 (current)
- **Release Blocker**: Yes — blocks v0.2.0

### Additional Context
The vulnerability exists in the search results rendering where `query` parameter is interpolated directly into JSX without sanitization. While React's default escaping prevents most XSS, the specific implementation uses `dangerouslySetInnerHTML` in the highlight component.

### Acceptance Criteria for Fix
1. [ ] Input sanitized using DOMPurify before rendering
2. [ ] Unit test added with XSS payload
3. [ ] ZAP re-scan passes (no HIGH alerts)
4. [ ] Code review approved by @security-champion
```

**Assignee changed**: @frontend-lead  
**Priority**: P0  
**Milestone**: v0.2.0

---

### State 4: In Progress 🔧

**Branch created**: `fix/SEC-001-xss-ticket-search`  
**Commit history**:

#### Commit 1: Reproduce the issue

```
commit a1b2c3d (HEAD -> fix/SEC-001-xss-ticket-search)
Author: frontend-lead <frontend@parkflow.dev>
Date:   Mon May 21 09:00:00 2026 -0500

    test(security): add failing XSS reproduction test
    
    Adds unit test demonstrating the reflected XSS vulnerability
    in TicketSearch component. Test fails before fix.
    
    Related to SEC-001, GitHub Issue #243
    
    - Adds XSS payload test cases
    - Verifies dangerous HTML is not rendered
    
    Evidence: ZAP Alert 40012
```

#### Commit 2: Implement fix

```
commit e4f5g6h
Author: frontend-lead <frontend@parkflow.dev>
Date:   Mon May 21 11:30:00 2026 -0500

    fix(security): sanitize ticket search query to prevent XSS
    
    Fixes reflected XSS vulnerability (SEC-001 / Issue #243) by:
    
    1. Adding DOMPurify to sanitize user input before rendering
    2. Removing dangerouslySetInnerHTML usage in search highlights
    3. Using React's safe text interpolation instead
    
    The fix ensures that malicious payloads like <script> tags
    are stripped before reaching the DOM.
    
    Before:
      <span dangerouslySetInnerHTML={{ __html: highlightQuery(result) }} />
    
    After:
      <span>{DOMPurify.sanitize(highlightQuery(result))}</span>
    
    Security: CWE-79, OWASP Top 10 2021 A03
    
    Closes #243
```

#### Commit 3: Add defensive tests

```
commit i7j8k9l
Author: frontend-lead <frontend@parkflow.dev>
Date:   Mon May 21 14:00:00 2026 -0500

    test(security): add comprehensive XSS test suite
    
    - Tests for script tag injection
    - Tests for event handler injection (onerror, onclick)
    - Tests for javascript: URI injection
    - Tests for HTML entity encoding bypasses
    
    All tests pass with DOMPurify sanitization active.
    
    Security: SEC-001
```

---

### State 5: Fixed ✅ (Pull Request)

**PR #145**: `fix(security): sanitize ticket search query to prevent XSS`

**Description**:
```markdown
## Summary
Fixes reflected XSS vulnerability (SEC-001) in ticket search functionality.

## Changes
- `apps/web/src/components/TicketSearch.tsx`: Added DOMPurify sanitization
- `apps/web/src/components/__tests__/TicketSearch.security.test.tsx`: Added XSS test suite
- `apps/web/package.json`: Added `dompurify` dependency

## Security Impact
- **CWE**: 79 (Cross-site Scripting)
- **Severity**: High → Resolved
- **Attack Vector**: Reflected XSS via query parameter

## Verification
- [x] ZAP baseline scan passes (no HIGH alerts)
- [x] Unit tests pass (including new XSS tests)
- [x] Manual testing with payloads:
  - `<script>alert(1)</script>`
  - `<img src=x onerror=alert(1)>`
  - `javascript:alert(1)`

## Evidence
- [ZAP Re-scan Report](../actions/runs/123789/artifacts/zap-baseline-reports)

## Related
- Closes #243
- SEC-001
```

---

### State 6: Retesting 🧪

#### Code Review by @security-champion

```markdown
## Code Review: Security Focus

### ✅ Approved with minor suggestions

**Reviewed files**:
1. `apps/web/src/components/TicketSearch.tsx`
2. `apps/web/src/components/__tests__/TicketSearch.security.test.tsx`

**Security Assessment**:

| Check | Status | Notes |
|-------|--------|-------|
| Input sanitization | ✅ Pass | DOMPurify correctly configured with default settings |
| Output encoding | ✅ Pass | React's JSX escaping is preserved |
| No dangerous HTML | ✅ Pass | `dangerouslySetInnerHTML` removed |
| Test coverage | ✅ Pass | 6 XSS payload test cases |
| Dependency check | ✅ Pass | DOMPurify v3.1.0 (no known CVEs) |

**Suggestions** (non-blocking):
1. Consider adding `FORBID_ATTR: ['style']` to DOMPurify config to prevent style-based attacks
2. Add a comment explaining why sanitization is needed (for future maintainers)

**Verdict**: LGTM 🚀
```

#### QA Evidence Comment

```markdown
## QA Retest Evidence

**Tester**: @qa-engineer  
**Date**: 2026-05-22 10:00 UTC  
**Environment**: CI — PR #145  
**Build**: `parkflow-web@0.1.0-pr145.3`

### Test Cases Executed

| ID | Test Case | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| XSS-01 | Script tag injection | Sanitized, no alert | Script stripped | ✅ PASS |
| XSS-02 | Img onerror injection | Sanitized, no alert | onerror stripped | ✅ PASS |
| XSS-03 | SVG onload injection | Sanitized, no alert | onload stripped | ✅ PASS |
| XSS-04 | javascript: URI | Sanitized | href removed | ✅ PASS |
| XSS-05 | Template literal injection | Escaped | `{alert(1)}` displayed as text | ✅ PASS |
| XSS-06 | HTML entity bypass | Normalized | `&#60;script&#62;` displayed as text | ✅ PASS |

### Automated Scans
- [x] ZAP Baseline: **0 HIGH, 0 MEDIUM** (clean)
- [x] Semgrep: No security findings
- [x] Unit tests: 42/42 passed

### Evidence Attachments
- [screenshot-xss-test-results.png](attachment)
- [zap-rescan-clean.html](attachment)

**Conclusion**: Defect SEC-001 is **verified fixed**. Ready to merge.
```

---

### State 7: Closed 🔒

**GitHub Issue #243** closed by @qa-lead:

```markdown
## Closure Summary

**Defect**: SEC-001 — Reflected XSS in Ticket Search  
**Resolution**: Fixed via DOMPurify sanitization  
**Merged**: PR #145 → `develop` (commit `m3n4o5p`)  
**Release**: v0.2.0

### Verification Completed
- [x] Code review approved by @security-champion
- [x] ZAP re-scan clean (no HIGH/MEDIUM findings)
- [x] QA retest passed (6/6 test cases)
- [x] Unit tests passing
- [x] No regression in existing functionality

### Lessons Learned
1. **Never use `dangerouslySetInnerHTML`** with user input — even for highlighting
2. **Always add security unit tests** when fixing vulnerabilities
3. **Run ZAP baseline before merge** to catch regressions

### Follow-up Actions
- [ ] Update secure coding guidelines with XSS prevention patterns
- [ ] Schedule security training for frontend team (Sprint 15)

Thank you @frontend-lead for the quick fix and @security-champion for the thorough review! 🙏

/close
```

---

## Evidence Templates

### QA Evidence Log Template

```markdown
## Evidence Log: [DEFECT-ID]

**Date**: YYYY-MM-DD  
**Tester**: @username  
**Environment**: [local/staging/prod]  
**Version**: [commit/tag]

### Test Objective
[What is being verified]

### Preconditions
- [ ] Application running at [URL]
- [ ] User authenticated as [role]
- [ ] Test data prepared

### Test Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Evidence
- [Screenshot/Video/Log]
- [ZAP Report]
- [Network trace]

### Verdict
[PASS / FAIL / BLOCKED]
```

### Commit Message Template (Security Fixes)

```
type(scope): imperative description

Detailed explanation of what changed and why.

- Bullet points for specific changes
- Security impact explanation

Security: CWE-XXX, OWASP YYYY A0X

Refs: #issue-number
```

### Security Review Comment Template

```markdown
## Security Review

| Check | Status | Evidence |
|-------|--------|----------|
| Input validation | ⬜ | |
| Output encoding | ⬜ | |
| Authentication | ⬜ | |
| Authorization | ⬜ | |
| Data protection | ⬜ | |
| Error handling | ⬜ | |

**Findings**:
- 

**Recommendations**:
- 

**Verdict**: [Approved / Changes Requested]
```

---

## Metrics from this Defect

| Metric | Value |
|--------|-------|
| Time to Detect | 5 minutes (CI scan) |
| Time to Triage | 1 hour 15 minutes |
| Time to Fix | 4 hours 30 minutes |
| Time to Verify | 2 hours |
| Total Lead Time | 8 hours |
| Escape Rate | 0 (caught in CI) |

---

*Document version: 1.0*  
*Standard: ISO/IEC 25010, OWASP Testing Guide v4.2*
