# Implementation Plan: CEO Operating System (CEO-OS)

## Overview

This plan implements the CEO-OS as a file-based, git-tracked system layered exactly as the design describes: git-tracked JSON **data stores** under `data/ceo-os/`, a layer of pure **core logic** modules (`lib/ceo-os/*`), an **integration** module that reads the existing analytics/opportunities endpoints with graceful degradation and persists through `lib/persist/writeData.js`, and a thin **cadence/read API** under `app/api/ceo-os/*`.

Implementation language is **JavaScript** (ES modules, 4-space indent, named exports, `@/` root alias), matching the existing repo conventions. Testing uses **Vitest + fast-check** (added in task 1, since no runner is configured yet). Property-based tests target the pure functions in `lib/ceo-os/*`; each correctness property gets its own test file so tests run in parallel without file-write conflicts. Each property test runs a minimum of 100 iterations and is tagged `// Feature: ceo-operating-system, Property {n}: ...`.

Tasks build incrementally: storage primitives and seeds first, then each pure-logic module with its property tests close behind, then the integration layer, then the API routes that wire everything together. There is no orphaned code — every module is consumed by a later route or seed validation.

## Tasks

- [ ] 1. Set up testing framework and CEO-OS directory structure
  - [ ] 1.1 Add Vitest + fast-check tooling
    - Add `vitest` and `fast-check` as devDependencies and a `"test": "vitest --run"` script to `package.json`
    - Create `vitest.config.js` configured for the `@/` root alias and ESM
    - _Requirements: foundation for 12.3_
  - [ ] 1.2 Create the CEO-OS directory skeleton
    - Create `data/ceo-os/`, `data/ceo-os/reports/daily/`, `data/ceo-os/reviews/weekly/`, `docs/ceo-os/`, `lib/ceo-os/`, `lib/ceo-os/__tests__/`, `app/api/ceo-os/`
    - _Requirements: foundation for 12.3_

- [ ] 2. Implement storage primitives and stable id generation
  - [ ] 2.1 Implement `lib/ceo-os/ids.js`
    - Stable, deterministic id constructors: `pri-*`, `task-*`, `esc-*`, `dr-<date>-<dept>`, `wr-<date>`
    - _Requirements: 2.1, 3.1, 10.2, 12.5_
  - [ ] 2.2 Implement `lib/ceo-os/store.js`
    - `readRegister(name, fallback)` returning a defined empty default shape when the file is absent (first run)
    - `writeRegister`/`persistRegister` delegating to `writeDataFiles` from `lib/persist/writeData.js` (never re-implement write-back)
    - Pure `upsertById(collection, record)` that replaces a same-id record in place rather than appending
    - `dailyReportPath(date)` and `weeklyReviewPath(date)` helpers
    - _Requirements: 12.3, 12.5_
  - [ ]* 2.3 Write property test for idempotent upsert
    - **Property 32: Records upsert by stable id**
    - **Validates: Requirements 12.5**
  - [ ]* 2.4 Write unit tests for store helpers
    - First-run default shapes, dated path helpers, and `persistRegister` delegating to `writeDataFiles`
    - _Requirements: 12.3_

- [ ] 3. Seed the git-tracked data stores
  - [ ] 3.1 Author `data/ceo-os/operating-model.json` and `docs/ceo-os/operating-model.md`
    - Responsibilities set, ordered decision loop (prioritize, delegate, monitor, review, decide), role assignments, primary/secondary KPI references, the six deliverables with cadence/interval/UTC time fields
    - Embed the P0–P3 Severity_Tier table with definitions and CEO response expectations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 10.1_
  - [ ] 3.2 Author `data/ceo-os/kpis.json` (KPI Dashboard seed)
    - Each KPI with name, definition, source, target, measurement period; designate primary (monthly Amazon clicks) and secondary (pins/week, Pinterest clicks); no raw-pageviews KPI carries a target
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ] 3.3 Author `data/ceo-os/departments.json` (Department Register seed)
    - Seven departments with charter, AI-agent employees, primary KPI, and data source; Automation → {WF-01, WF-02, WF-04, WF-06}; Discovery → Opportunities_Endpoint; Analytics_Reporting → Analytics_Endpoint; Compliance → FTC + Amazon Associates responsibilities
    - Seed empty `data/ceo-os/priorities.json`, `data/ceo-os/tasks.json`, `data/ceo-os/escalations.json` with their default shapes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 2.7, 3.7, 10.9_
  - [ ]* 3.4 Write unit/smoke tests for seeds and artifact existence
    - Assert each seed file parses and matches its schema, and the dated-record path helpers resolve; verify operating-model fields and the seven-department mapping
    - _Requirements: 1.1, 1.8, 4.1, 4.8, 8.1, 8.2, 8.3_

- [ ] 4. Implement Priority Register logic
  - [ ] 4.1 Implement `lib/ceo-os/priorities.js`
    - `getPriorities` (active, sorted by ascending rank), `validateRanks` (unique among active), `addPriority` (assigns/normalizes rank + target outcome), `rankPriorities` (re-rank, append dated entry to `rankHistory`), `linkedKpis`, `isRevenuePriority`
    - Revenue-maximizing ordering: primary-KPI priority above non-KPI priority; same-KPI candidates ordered by descending expected outbound-click improvement, allowing a zero-improvement candidate to still be ranked and selected; never use raw pageviews to justify rank
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 11.1, 11.3, 11.4_
  - [ ]* 4.2 Write property test for priority completeness
    - **Property 1: Priority record completeness**
    - **Validates: Requirements 2.1, 2.3**
  - [ ]* 4.3 Write property test for unique, ordered ranks
    - **Property 2: Active ranks are unique and ordered**
    - **Validates: Requirements 2.2**
  - [ ]* 4.4 Write property test for KPI links
    - **Property 3: Every priority links to a KPI, revenue priorities to a primary/secondary KPI**
    - **Validates: Requirements 2.4, 2.5**
  - [ ]* 4.5 Write property test for re-rank history preservation
    - **Property 4: Re-ranking preserves a dated previous ranking**
    - **Validates: Requirements 2.6**
  - [ ]* 4.6 Write property test for revenue-maximizing ordering
    - **Property 5: Revenue-maximizing ordering**
    - **Validates: Requirements 11.1, 11.3**
  - [ ]* 4.7 Write property test for pageview exclusion
    - **Property 6: Raw pageviews are never targeted or used to justify rank**
    - **Validates: Requirements 8.4, 11.4**

- [ ] 5. Implement KPI Dashboard computation logic
  - [ ] 5.1 Implement `lib/ceo-os/kpi.js`
    - `computeKpiView` returning ok / no-target / data-unavailable views with `asOf` timestamp; `variance` (current − target); `isTargetedPageview` guard; `sourceFor` routing
    - data-unavailable must yield `current:null` (never coerced to zero)
    - _Requirements: 5.5, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  - [ ]* 5.2 Write property test for KPI view across all data states
    - **Property 17: KPI view is correct across all data states**
    - **Validates: Requirements 5.5, 8.7, 8.8, 8.9, 8.10**
  - [ ]* 5.3 Write property test for KPI sourcing routing
    - **Property 18: KPI sourcing routing**
    - **Validates: Requirements 8.5, 8.6**

- [ ] 6. Implement Department Register logic
  - [ ] 6.1 Implement `lib/ceo-os/departments.js`
    - `DEPARTMENTS` constant, `getDepartments`, `getDepartmentById`, `validateReferentialIntegrity(register, dashboard)` (every `primaryKpiId` resolves to a dashboard KPI), `ownerForEscalation`
    - _Requirements: 4.1, 4.7, 10.8_
  - [ ]* 6.2 Write property test for department-KPI referential integrity
    - **Property 14: Department KPIs resolve to dashboard KPIs**
    - **Validates: Requirements 4.7**

- [ ] 7. Checkpoint - storage, seeds, and first logic modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Task Allocation logic
  - [ ] 8.1 Implement `lib/ceo-os/tasks.js`
    - `TASK_STATUSES` enum; `validateTask` (id, objective, exactly one owning department, Severity_Tier, due date, status enum; allocation date when allocated; blocking dependency id when blocked); `allocateTask`; `setStatus` (sets `blockedSince` on entering blocked, requires dependency id); `isOverdue`; `blockedOperatingDays` (counts the change day as day 1)
    - Cross-state helper to verify each task's `priorityId` resolves to an existing priority
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.2, 9.4_
  - [ ]* 8.2 Write property test for task validation invariants
    - **Property 7: Task validation invariants**
    - **Validates: Requirements 3.1, 3.2, 3.5, 3.6**
  - [ ]* 8.3 Write property test for single-department allocation
    - **Property 8: Allocation assigns exactly one department**
    - **Validates: Requirements 3.3**
  - [ ]* 8.4 Write property test for task-to-priority references
    - **Property 9: Tasks reference an existing priority**
    - **Validates: Requirements 3.4**

- [ ] 9. Implement Department Monitoring logic
  - [ ] 9.1 Implement `lib/ceo-os/monitor.js`
    - `openTaskCountsByStatus`, `reportingStatus` (returns "not-reporting" when no report exists regardless of outage/maintenance flags), `departmentMonitorRow` (uses `kpi.computeKpiView` for current value + variance)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 9.2 Write property test for open-task counts
    - **Property 15: Open-task counts match the task set**
    - **Validates: Requirements 5.1**
  - [ ]* 9.3 Write property test for reporting status
    - **Property 16: Reporting status reflects report presence only**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [ ] 10. Implement Bottleneck Detector logic
  - [ ] 10.1 Implement `lib/ceo-os/bottlenecks.js`
    - `flagOverdueTask`, `flagBlockedTask` (uses `tasks.blockedOperatingDays`), `flagDecliningDepartment` (two consecutive measurement periods), `detectBottlenecks`, `bottlenecksToEscalations` (each flag → one escalation draft with a Severity_Tier); every flag records affected department, affected KPI, and triggering rule
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [ ]* 10.2 Write property test for overdue-task detection
    - **Property 10: Overdue task detection**
    - **Validates: Requirements 9.2**
  - [ ]* 10.3 Write property test for blocked-day counting and detection
    - **Property 11: Blocked-day counting and blocked-task detection**
    - **Validates: Requirements 9.4, 9.5**
  - [ ]* 10.4 Write property test for declining-department detection
    - **Property 12: Declining-department detection**
    - **Validates: Requirements 9.3**
  - [ ]* 10.5 Write property test for well-formed, escalated flags
    - **Property 13: Bottleneck flags are well-formed and escalated**
    - **Validates: Requirements 9.1, 9.6, 9.7**

- [ ] 11. Implement Escalation Process logic
  - [ ] 11.1 Implement `lib/ceo-os/escalations.js`
    - `ESCALATION_STATUSES`, `SEVERITY_TIERS`; `classifyCompliance` (FTC/Associates → P0); `createEscalation` (id, routes to owning dept via Department Register, sets `timeoutAt` for P0); `decideEscalation` (records decision, date, resulting task/priority); `isGating` (P0 open within timeout gates, false at/after timeout); `validateEscalation` (status enum + decided-fields invariant)
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  - [ ]* 11.2 Write property test for escalation creation and routing
    - **Property 26: Escalation creation and routing**
    - **Validates: Requirements 10.2, 10.8**
  - [ ]* 11.3 Write property test for compliance classification
    - **Property 27: Compliance violations are P0**
    - **Validates: Requirements 10.3**
  - [ ]* 11.4 Write property test for P0 gating around the timeout
    - **Property 28: P0 gating around the timeout**
    - **Validates: Requirements 10.4, 10.5**
  - [ ]* 11.5 Write property test for status constraint
    - **Property 29: Escalation status is constrained**
    - **Validates: Requirements 10.6**
  - [ ]* 11.6 Write property test for deciding an escalation
    - **Property 30: Deciding an escalation records the decision**
    - **Validates: Requirements 10.7**

- [ ] 12. Checkpoint - tasks, monitoring, bottlenecks, escalations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement Daily Reporting Framework logic
  - [ ] 13.1 Implement `lib/ceo-os/reports.js`
    - `buildDailyReport` (date, owning department, completed, in-progress, blockers, department primary KPI value; outbound-click figure from analytics view or `data-unavailable`; opportunity summary for Discovery dept); `validateBlockers` (every blocker carries a Severity_Tier); `escalationsFromBlockers` (exactly the P0/P1 blockers → escalation drafts)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 13.2 Write property test for daily report assembly
    - **Property 19: Daily report assembly**
    - **Validates: Requirements 6.1, 6.3, 6.4**
  - [ ]* 13.3 Write property test for blocker severity and escalation
    - **Property 20: Blocker severity and escalation**
    - **Validates: Requirements 6.5, 6.6**

- [ ] 14. Implement Weekly Review Framework logic
  - [ ] 14.1 Implement `lib/ceo-os/reviews.js`
    - `compareKpis` (per-KPI trend up/down/flat vs prior week); `buildWeeklyReview` (review date, primary/secondary trends, department performance, bottlenecks, decisions, weekly totals for pins + Pinterest clicks; ≥1 decision targeting a primary/secondary KPI); `correctivePrioritiesFor` (declines → corrective priority drafts); `confirmAllRanks` (covers every active priority once); `contributingDepartments` (when primary met/exceeded); `hasKpiTargetedDecision`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.2, 11.5_
  - [ ]* 14.2 Write property test for weekly review assembly
    - **Property 21: Weekly review assembly**
    - **Validates: Requirements 7.1, 7.4, 11.2**
  - [ ]* 14.3 Write property test for KPI trend comparison
    - **Property 22: KPI trend comparison**
    - **Validates: Requirements 7.3**
  - [ ]* 14.4 Write property test for corrective priorities
    - **Property 23: Declines produce corrective priorities**
    - **Validates: Requirements 7.5**
  - [ ]* 14.5 Write property test for rank confirmation coverage
    - **Property 24: Every active priority's rank is confirmed**
    - **Validates: Requirements 7.6**
  - [ ]* 14.6 Write property test for contributor recording
    - **Property 25: Meeting the primary target records contributors**
    - **Validates: Requirements 11.5**

- [ ] 15. Implement integration and persistence layer
  - [ ] 15.1 Implement `lib/ceo-os/integration.js`
    - `readAnalyticsLatest`/`readOpportunitiesLatest` translating HTTP 404, non-200, and network failures into `{available:false}`; `outboundClicksFromSnapshot`; `pinsPublishedThisWeek`; `persist` delegating to the store/`writeDataFiles`
    - Dashboard/report builders mark only KPIs from unavailable sources as `data-unavailable` and still produce the rest of the output
    - _Requirements: 5.6, 12.1, 12.2, 12.4_
  - [ ]* 15.2 Write property test for graceful degradation
    - **Property 31: Graceful degradation across unavailable sources**
    - **Validates: Requirements 12.4**
  - [ ]* 15.3 Write integration tests for endpoint reads
    - Mock `/api/analytics/latest` and `/api/opportunities/latest` including the 404 first-run path; assert `{available:false}` translation and summed outbound clicks
    - _Requirements: 12.1, 12.2_

- [ ] 16. Checkpoint - reporting, review, integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Wire the cadence and read API routes
  - [ ] 17.1 Implement read routes `app/api/ceo-os/dashboard/route.js` and `app/api/ceo-os/monitor/route.js`
    - Unauthenticated GET routes returning the `{ok:true,...}` envelope; dashboard aggregates `kpi.computeKpiView` over the seeded KPIs using integration reads; monitor returns per-department rows; `runtime="nodejs"`, `dynamic="force-dynamic"`
    - _Requirements: 5.1, 5.5, 8.7, 8.8, 8.9, 8.10, 12.4_
  - [ ] 17.2 Implement cadence routes `app/api/ceo-os/daily-report/route.js` and `app/api/ceo-os/weekly-review/route.js`
    - Authed POST (shared secret via `Authorization: Bearer`/`x-ceo-os-secret`); daily-report assembles + persists a dated report and raises P0/P1 blockers to escalations; weekly-review runs comparison, bottleneck detection, re-prioritization, and persists the dated review; echo `persisted`/`pr`
    - _Requirements: 6.1, 6.6, 6.7, 7.1, 7.5, 7.6, 7.7, 9.1, 9.7, 11.2, 11.5, 12.3, 12.5_
  - [ ] 17.3 Implement mutation routes `app/api/ceo-os/priorities/route.js`, `tasks/route.js`, and `escalations/route.js`
    - Authed POST that validate the body (`validatePriority`/`validateTask`/`validateEscalation`), upsert by stable id through the store, and return 401/400/500/200; priorities route supports create + re-rank; escalations route supports raise + decide
    - _Requirements: 2.1, 2.6, 3.1, 3.3, 10.2, 10.7, 10.8, 12.3, 12.5_
  - [ ]* 17.4 Write integration tests for the API routes
    - Read routes return the envelope with no auth; mutation/cadence routes enforce the shared secret (401), reject invalid bodies (400), and persist through a mocked `writeDataFiles` including the `persisted:false` degradation path
    - _Requirements: 12.3, 12.4_

- [ ] 18. Final checkpoint - full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks (property, unit, integration) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each correctness property (1–32) is its own sub-task placed close to the code it validates, annotated with its property number and the requirement clause it checks, and lives in its own file under `lib/ceo-os/__tests__/*.property.test.js` so the suite parallelizes without write conflicts.
- Property tests run a minimum of 100 iterations (`fc.assert(..., { numRuns: 100 })`) and are tagged `// Feature: ceo-operating-system, Property {n}: ...`.
- All writes go through the existing persistence layer (`lib/persist/writeData.js`); no new persistence mechanism is introduced.
- Checkpoints ensure incremental validation at natural layer boundaries.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2", "3.3", "4.1", "5.1", "6.1", "8.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.4", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "5.2", "5.3", "6.2", "8.2", "8.3", "8.4", "9.1", "10.1", "11.1", "15.1"] },
    { "id": 3, "tasks": ["9.2", "9.3", "10.2", "10.3", "10.4", "10.5", "11.2", "11.3", "11.4", "11.5", "11.6", "13.1", "14.1", "15.2", "15.3"] },
    { "id": 4, "tasks": ["13.2", "13.3", "14.2", "14.3", "14.4", "14.5", "14.6", "17.1", "17.2", "17.3"] },
    { "id": 5, "tasks": ["17.4"] }
  ]
}
```
