# Implementation Plan: PMO Coordination System

## Overview

This plan implements the PMO Coordination System (PMO-CS) as a layered JavaScript module set inside the existing Next.js repo, following the CEO-OS conventions described in `design.md`: git-tracked flat JSON under `data/pmo/`, pure side-effect-free core logic under `lib/pmo/`, an integration layer that reads CEO-OS registers and persists through `lib/persist/writeData.js`, and a thin authenticated API/cadence layer under `app/api/pmo/*`.

Implementation language is **JavaScript** (ES modules, 4-space indent, named exports, double-quoted strings) using **Vitest** as the runner and **fast-check** for property-based tests, matching the design's Testing Strategy. Each step builds on the previous one: storage + id primitives first, then each pure deliverable module with its property tests, then the integration layer, then the API routes, and finally the scheduled `run` cadence that wires intake → routing → scoring → roll-up together.

## Tasks

- [ ] 1. Set up test framework, data stores, and storage/id primitives
  - [ ] 1.1 Set up Vitest + fast-check and scaffold the PMO data stores
    - Add `vitest` and `fast-check` as dev dependencies and a `test` script (single-run, e.g. `vitest run`)
    - Create `data/pmo/` and seed `routing-rules.json` with the seven ordered charter rules and the `PMO_Triage` fallback exactly as defined in the design Data Models
    - Create empty register files `goals.json`, `tasks.json`, `projects.json`, `messages.json`, `escalations.json` each as `{ "version": 1, "<collection>": [] }`, and the `data/pmo/progress/` directory
    - _Requirements: 1.7, 4.5, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 11.6_

  - [ ] 1.2 Implement `lib/pmo/store.js` storage primitives
    - Implement `readRegister(name, fallback)` returning a defined empty default when the file is absent, `writeRegister(name, value, opts)` delegating to `writeDataFiles`, the pure `upsertById(collection, record)`, and `progressReportPath(date)`
    - _Requirements: 5.9, 10.7, 11.5, 11.6_

  - [ ]* 1.3 Write property test for `upsertById` idempotence
    - **Property 33: Records upsert by stable id**
    - **Validates: Requirements 11.5**

  - [ ] 1.4 Implement `lib/pmo/ids.js` stable identifier constructors
    - Implement `goalId`, `taskId`, `projectId`, `milestoneId`, `messageId`, `escalationId`, `progressReportId`, deriving goal/task ids from stable inputs so re-ingest/re-decompose upserts rather than duplicates
    - _Requirements: 2.4, 3.5, 5.1, 10.7_

- [ ] 2. Implement Goal Intake (Requirement 2)
  - [ ] 2.1 Implement `lib/pmo/goals.js`
    - Implement `intakeGoal`, `intakeAll`, `validateGoal`, `reconcileRank`, and `kpiMissingEscalation`; key Goals on the source priority id, preserve rank order, and record `linkedKpi: "not-set"` with a P3 escalation draft when a KPI is absent
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Write property test for goal intake field set
    - **Property 1: Goal intake mirrors the priority with a complete field set**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.3 Write property test for rank-order preservation
    - **Property 2: Intake preserves Priority_Register rank order**
    - **Validates: Requirements 2.3**

  - [ ]* 2.4 Write property test for intake idempotence
    - **Property 3: Goal intake is idempotent by source priority id**
    - **Validates: Requirements 2.4**

  - [ ]* 2.5 Write property test for rank reconciliation
    - **Property 4: A re-ranked priority reconciles its Goal's rank**
    - **Validates: Requirements 2.6**

  - [ ]* 2.6 Write example test for the missing-KPI intake path
    - Assert a priority without a linked KPI yields `linkedKpi: "not-set"` and a P3 escalation draft
    - _Requirements: 2.5_

- [ ] 3. Implement Task records and decomposition (Requirement 3)
  - [ ] 3.1 Implement `lib/pmo/tasks.js`
    - Define `TASK_STATUSES`, implement `decomposeGoal` (1+ tasks, each linked to one goal, status `backlog`), `validateTask`, `isOverdue`, and `reDecompose`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 5.7_

  - [ ]* 3.2 Write property test for decomposition output
    - **Property 5: Decomposition yields one-or-more backlog tasks each linked to one Goal**
    - **Validates: Requirements 3.1, 3.3, 3.6**

  - [ ]* 3.3 Write property test for task validation invariants
    - **Property 6: Task validation invariants**
    - **Validates: Requirements 3.2, 3.4**

- [ ] 4. Implement Deduplication of work (Requirement 8)
  - [ ] 4.1 Implement `lib/pmo/dedup.js`
    - Implement `normalize`, `taskFingerprint` (deterministic hash of the normalized triple), `findOpenDuplicate`, `dedupeOnCreate` (reuse open task across all departments), and `crossDepartmentCollisions`; `reDecompose` matching keys on the fingerprint
    - _Requirements: 3.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 4.2 Write property test for fingerprint determinism
    - **Property 10: Task_Fingerprint is deterministic and normalization-stable**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 4.3 Write property test for create-time deduplication
    - **Property 11: Creation deduplicates against open tasks across all departments**
    - **Validates: Requirements 3.5, 8.3, 8.4, 8.6**

  - [ ]* 4.4 Write property test for cross-department collisions
    - **Property 12: Cross-department fingerprint collisions raise a P3 consolidation escalation**
    - **Validates: Requirements 8.5**

- [ ] 5. Implement Task Routing System (Requirement 4)
  - [ ] 5.1 Implement `lib/pmo/routing.js`
    - Implement `matchCondition` (closed operator set `eq`/`in`/`contains`/`matches`), `evaluateRules` (ordered, first match), `routeTask` (records matched rule id; assigns `PMO_Triage` + P3 draft on no match), `validateRuleSet`, and `TRIAGE_QUEUE`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.14, 11.10_

  - [ ]* 5.2 Write property test for routing determinism and first-match
    - **Property 7: Routing is deterministic and assigns the first matching rule**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.6**

  - [ ]* 5.3 Write property test for rule-target validity
    - **Property 8: Every routing-rule target is a defined Department**
    - **Validates: Requirements 1.4, 4.2**

  - [ ]* 5.4 Write property test for n8n-portable conditions
    - **Property 9: Routing rules are n8n-portable and free of external state**
    - **Validates: Requirements 4.14, 11.10**

  - [ ]* 5.5 Write example tests for the seven charter mappings and the fallback
    - Over the seeded `routing-rules.json`, assert each domain routes to its department (pin/Pinterest→Pinterest_Distribution, product/page→Content_and_Pages, n8n→Automation, trend/product discovery→Discovery_Opportunity_Intelligence, schema/llms.txt/AI-citability→GEO_SEO_Citability, metrics/measurement→Analytics_Reporting, FTC/Amazon-Associates→Compliance) and that an unmatched domain falls back to `PMO_Triage` with a P3 draft
    - _Requirements: 4.5, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Priority Scoring Model (Requirement 7)
  - [ ] 7.1 Implement `lib/pmo/scoring.js`
    - Define coefficients `PRIMARY_W > SECONDARY_W > 0`, implement `severityWeight`, `priorityScore` (weighted sum, no pageviews input), `compareForRank`, and `rank`; write the computed score back to the record's `priorityScore`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8, 7.9, 7.10_

  - [ ]* 7.2 Write property test for scoring determinism
    - **Property 13: Priority_Score is deterministic and total over its four inputs**
    - **Validates: Requirements 7.1, 7.2, 7.5**

  - [ ]* 7.3 Write property test for pageview exclusion
    - **Property 14: Priority_Score ignores raw pageviews everywhere**
    - **Validates: Requirements 7.4, 10.5**

  - [ ]* 7.4 Write property test for primary-impact monotonicity
    - **Property 15: Priority_Score is monotonic non-decreasing in primary KPI impact**
    - **Validates: Requirements 7.6**

  - [ ]* 7.5 Write property test for primary-over-secondary dominance
    - **Property 16: Primary KPI impact dominates secondary KPI impact**
    - **Validates: Requirements 7.3, 7.7**

  - [ ]* 7.6 Write property test for the ranking total order
    - **Property 17: Ranking is a deterministic total order favoring primary impact**
    - **Validates: Requirements 7.8, 7.9**

  - [ ]* 7.7 Write property test for score write-back
    - **Property 18: The computed score is recorded on the record**
    - **Validates: Requirements 7.10**

- [ ] 8. Implement Project Tracking Framework (Requirement 5)
  - [ ] 8.1 Implement `lib/pmo/projects.js`
    - Implement `projectForGoal`, `computeProjectStatus`, `isAtRisk`, `completeMilestone`, `overdueMilestoneEscalation` (P2 draft), `validateProject`, and `validateMilestone`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9_

  - [ ]* 8.2 Write property test for goal-to-project grouping
    - **Property 19: A Goal's tasks group under exactly one Project**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 8.3 Write property test for project/milestone validation
    - **Property 20: Project and Milestone validation invariants**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 8.4 Write property test for project status derivation
    - **Property 21: Project status and at-risk derive purely from member task statuses**
    - **Validates: Requirements 5.4, 5.6**

  - [ ]* 8.5 Write property test for milestone completion
    - **Property 22: A milestone completes exactly when all its tasks are done**
    - **Validates: Requirements 5.5**

  - [ ]* 8.6 Write property test for overdue detection
    - **Property 23: Overdue detection for tasks and milestones**
    - **Validates: Requirements 5.7, 5.8**

- [ ] 9. Implement Department Communication Protocol (Requirement 6)
  - [ ] 9.1 Implement `lib/pmo/messages.js`
    - Define `MESSAGE_TYPES` and `PARTIES`, implement `validateMessage`, `assignmentMessage`, `handoffMessage`, `serializeMessage`, and `parseMessage` (exact inverses)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 9.2 Write property test for message validation invariants
    - **Property 24: Coordination_Message validation invariants**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6**

  - [ ]* 9.3 Write property test for assignment/handoff emission
    - **Property 25: Routing emits an assignment message; transfers emit a handoff**
    - **Validates: Requirements 6.4, 6.5**

  - [ ]* 9.4 Write property test for serialization round-trip
    - **Property 26: Coordination_Message serialization round-trips**
    - **Validates: Requirements 6.7, 6.8**

- [ ] 10. Implement Escalation Rules (Requirement 9)
  - [ ] 10.1 Implement `lib/pmo/escalations.js`
    - Define `ESCALATION_STATUSES` and `SEVERITY_TIERS` (reused from CEO-OS), implement `classifyComplianceViolation` (P0), `blockedTooLongEscalation` (P1), `createEscalation` (routes to owner department), `isGatingP0`, `upsertEscalation`, and `validateEscalation`
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 10.2 Write property test for escalation creation/routing
    - **Property 27: Escalation creation produces a complete, validly-routed record**
    - **Validates: Requirements 9.3, 9.8**

  - [ ]* 10.3 Write property test for escalation status enum
    - **Property 28: Escalation status is constrained to the enum**
    - **Validates: Requirements 9.4**

  - [ ]* 10.4 Write property test for compliance P0 gating
    - **Property 29: Compliance violations are classified P0 and gate dependent work**
    - **Validates: Requirements 9.5, 9.7**

  - [ ]* 10.5 Write property test for blocked-too-long escalation
    - **Property 30: A task blocked two or more operating days escalates to P1**
    - **Validates: Requirements 9.6**

  - [ ]* 10.6 Write property test for escalation upsert idempotence
    - **Property 31: Escalation upsert is idempotent by stable id**
    - **Validates: Requirements 9.9**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement Progress Reporting and Roll-up logic (Requirement 10)
  - [ ] 12.1 Implement `lib/pmo/progress.js`
    - Implement `buildProgressReport`, `taskCountsByStatusByDepartment`, `milestoneCompletion`, `openEscalationsBySeverity`, `kpiContribution` (pageviews excluded), `departmentsWithNoActivity`, and `rollUp`
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_

  - [ ]* 12.2 Write property test for progress aggregation
    - **Property 32: Progress report aggregates every department correctly**
    - **Validates: Requirements 10.1, 10.2, 10.4, 10.6**

- [ ] 13. Implement integration layer and PMO mandate artifact
  - [ ] 13.1 Implement `lib/pmo/integration.js`
    - Implement `readPriorityRegister`, `readDepartmentRegister`, `readKpiDashboard` (all returning safe empty defaults when absent), `persist` (delegates to `writeDataFiles`), and `raiseToEscalationProcess` (writes the shared `data/ceo-os/escalations.json` record shape)
    - _Requirements: 2.1, 4.2, 9.2, 9.8, 10.2, 11.5, 11.6, 11.9_

  - [ ] 13.2 Create the PMO operating mandate artifact
    - Add a git-tracked JSON artifact under `data/pmo/` declaring the six PMO responsibilities, the below-CEO/above-Departments position, treating the Ghost CEO role as unchanged, the five named deliverables, and reuse of CEO-OS Severity_Tiers/KPIs/Department names/Data_Store conventions
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ]* 13.3 Write integration test for escalation roll-into-CEO-process
    - With a mocked persistence layer, assert raising a PMO escalation writes into the shared `data/ceo-os/escalations.json` stream
    - _Requirements: 9.2_

  - [ ]* 13.4 Write smoke tests for artifacts and CEO-OS alignment
    - Assert `data/pmo/*.json` parse and are keyed by stable id, the mandate artifact lists responsibilities/position/deliverables, and `SEVERITY_TIERS`/Department names/Task status enum/KPI ids equal their CEO-OS sources
    - _Requirements: 1.3, 1.6, 1.7, 5.9, 9.1, 10.7, 11.6_

- [ ] 14. Implement the PMO API layer (Requirement 11)
  - [ ] 14.1 Implement shared auth/JSON helper and the intake + decompose routes
    - Add a shared helper validating `Authorization: Bearer`/`x-pmo-secret` and parsing JSON, then implement `app/api/pmo/intake/route.js` (ingest Goals) and `app/api/pmo/decompose/route.js` (decompose a Goal into Tasks) with `nodejs`/`force-dynamic`, the `{ ok, ... }` envelope, and 401/400/200 semantics
    - _Requirements: 2.1, 3.1, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 14.2 Implement the route, score, and tasks routes
    - Implement `app/api/pmo/route/route.js` (route tasks, emit assignment messages), `app/api/pmo/score/route.js` (recompute Priority_Scores), and `app/api/pmo/tasks/route.js` (create/update with dedup-on-create); all authed idempotent upserts
    - _Requirements: 4.1, 6.4, 7.1, 8.3, 11.5_

  - [ ] 14.3 Implement the projects, messages, and escalations routes
    - Implement `app/api/pmo/projects/route.js`, `app/api/pmo/messages/route.js` (validate + emit), and `app/api/pmo/escalations/route.js`; all authed idempotent upserts with validation-error 400s
    - _Requirements: 5.2, 6.1, 6.6, 9.3, 11.5_

  - [ ] 14.4 Implement the read routes (board, progress)
    - Implement unauthenticated `app/api/pmo/board/route.js` (projects/tasks board) and `app/api/pmo/progress/route.js` (latest progress report) returning the `{ ok, ... }` envelope with only aggregate coordination data
    - _Requirements: 10.1, 11.1_

  - [ ]* 14.5 Write integration tests for auth, validation, persistence, and n8n invocation
    - Assert authorized writes succeed; missing/invalid secret returns 401 with no write; invalid/empty JSON returns 400 with no write; `persisted:false` read-only degradation is echoed; routes are callable by schedule trigger and webhook
    - _Requirements: 11.2, 11.3, 11.4, 11.7, 11.9_

- [ ] 15. Wire the scheduled coordination run and roll-up
  - [ ] 15.1 Implement the run cadence route
    - Implement `app/api/pmo/run/route.js` to compose intake → routing (over un-routed tasks) → score recomputation, persist results, and produce the roll-up shape consumed by the Daily and Weekly frameworks
    - _Requirements: 10.3, 11.7, 11.8_

  - [ ]* 15.2 Write integration test for the run composition and roll-up
    - Over a fixture with mocked CEO-OS registers, assert `run` ingests, routes, rescoring persists, and the roll-up output matches the Daily/Weekly framework shape
    - _Requirements: 10.3, 11.8_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks (property, example, integration, smoke) and can be skipped for a faster MVP, but each property test maps one-to-one to a design Correctness Property.
- Each task references specific, granular requirements clauses for traceability.
- Checkpoints (tasks 6, 11, 16) ensure incremental validation at natural boundaries.
- Property tests use `fast-check` at a minimum of 100 iterations and are located at `lib/pmo/__tests__/*.property.test.js`, each tagged with its design property number.
- Pure logic in `lib/pmo/*` is implemented before the API layer so the deterministic coordination rules are validated independently of I/O.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "13.2"] },
    { "id": 2, "tasks": ["2.1", "4.1", "5.1", "7.1", "9.1", "10.1"] },
    { "id": 3, "tasks": ["1.3", "3.1", "8.1", "13.1", "2.2", "2.3", "2.4", "2.5", "2.6", "4.2", "4.3", "4.4", "5.2", "5.3", "5.4", "5.5", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "9.2", "9.3", "9.4", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 4, "tasks": ["3.2", "3.3", "8.2", "8.3", "8.4", "8.5", "8.6", "12.1", "13.3", "13.4", "14.1"] },
    { "id": 5, "tasks": ["12.2", "14.2", "14.3", "14.4"] },
    { "id": 6, "tasks": ["14.5", "15.1"] },
    { "id": 7, "tasks": ["15.2"] }
  ]
}
```
