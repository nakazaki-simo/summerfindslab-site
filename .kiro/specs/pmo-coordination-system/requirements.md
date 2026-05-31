# Requirements Document

## Introduction

The PMO Coordination System (PMO-CS) is the coordination layer through which the Project Management Office (PMO) of Ghost Corporation runs cross-department execution for the Summer Finds Lab Daily affiliate engine. The PMO sits below the Ghost CEO and above the seven Departments. The PMO does not redefine or replace the Ghost CEO; it receives goals from the CEO via the existing Priority_Register, breaks those goals into executable Tasks, routes each Task to the correct Department, tracks execution end to end, rolls progress up into the CEO reporting cadences, and prevents duplicate work across Departments.

This specification is consistent with, and depends on, the existing CEO Operating System specification (`.kiro/specs/ceo-operating-system/requirements.md`). It reuses the same Department names, the same P0–P3 Severity_Tiers, the same Primary/Secondary KPI definitions, the same `Escalation_Process`, and the same file-based, git-tracked JSON `Data_Store` under `data/`. The PMO-CS adds no new authority above the Ghost CEO.

This document defines requirements for the PMO mission and its five concrete, implementation-ready deliverables:

1. **Task Routing System** — deterministic rules that map a Goal or Task to the owning Department, keyed on the Department charters in the Department_Register.
2. **Project Tracking Framework** — how in-flight work, milestones, and status are tracked end to end.
3. **Department Communication Protocol** — the structured message and handoff format between the PMO and Departments and between Departments.
4. **Priority Scoring Model** — a quantitative model that ranks Goals and Tasks, favoring the Primary_KPI (monthly outbound Amazon clicks) and Secondary_KPI (pins per week plus Pinterest outbound clicks), and deliberately excluding raw pageviews.
5. **Escalation Rules** — when and how the PMO escalates into the CEO `Escalation_Process`, reusing the P0–P3 Severity_Tiers.

The entire system is designed to be compatible with the n8n automation layer (ADR-009: n8n orchestrates, never owns data). Every PMO record is a git-tracked JSON record that n8n nodes can read and write through repo `/api/*` endpoints using bearer or shared-secret authentication, with idempotent upserts keyed by a stable identifier so repeated writes update rather than duplicate. Routing is deterministic so it can be executed by an n8n Code or Switch node, and PMO operations are both schedule-triggerable and webhook-triggerable.

## Glossary

- **Ghost CEO**: The solo human operator acting as Chief Executive of Ghost Corporation, as defined in the CEO Operating System. The PMO does not redefine this role.
- **Ghost Corporation**: The operating company that runs the Summer Finds Lab Daily affiliate engine.
- **CEO_Operating_System**: The existing umbrella framework (CEO-OS) governing how the Ghost CEO runs the company. The PMO-CS consumes its outputs.
- **Project_Management_Office**: The coordination function, abbreviated PMO, that sits below the Ghost CEO and above the Departments and coordinates cross-department execution.
- **PMO_Coordination_System**: The umbrella deliverable set defined by this specification, abbreviated PMO-CS, comprising the Task_Routing_System, Project_Tracking_Framework, Department_Communication_Protocol, Priority_Scoring_Model, and Escalation_Rules.
- **Department**: A functional area of the company executed by AI-agent employees, as defined in the Department_Register.
- **Department_Register**: The authoritative CEO-OS record of all Departments, their charters, owners, primary KPIs, and data sources.
- **Department_Charter**: The charter field of a Department in the Department_Register that states the Department's scope of responsibility.
- **Routing_Domain**: A named area of work declared for a Department and used by the Task_Routing_System to match Tasks to that Department.
- **Goal**: A unit of CEO-defined direction that the PMO ingests from a single Priority_Register priority.
- **Priority_Register**: The existing CEO-OS authoritative, ranked record of company priorities and target outcomes.
- **Task**: A unit of delegated execution work decomposed from a Goal, with an owning Department, an objective, a Severity_Tier, a due date, a status, and a Priority_Score.
- **Task_Allocation_System**: The existing CEO-OS deliverable governing Task records and statuses. The PMO-CS conforms to its Task status values.
- **Goal_Intake**: The PMO process of receiving Goals from the Priority_Register.
- **Goal_Decomposition**: The PMO process of breaking a Goal into one or more Tasks.
- **Task_Routing_System**: PMO deliverable 1. The deterministic rule set mapping each Task to exactly one owning Department.
- **Routing_Rule**: A single, ordered JSON rule with a match condition and a target Department evaluated by the Task_Routing_System.
- **Project_Tracking_Framework**: PMO deliverable 2. The framework for tracking in-flight work, milestones, and status end to end.
- **Project**: A grouping of related Tasks under a single Goal, tracked through milestones and status.
- **Milestone**: A dated checkpoint within a Project with a description, a due date, and a status.
- **Department_Communication_Protocol**: PMO deliverable 3. The structured message and handoff format between the PMO and Departments and between Departments.
- **Coordination_Message**: A single structured message exchanged under the Department_Communication_Protocol.
- **Priority_Scoring_Model**: PMO deliverable 4. The quantitative model that computes a Priority_Score for Goals and Tasks.
- **Priority_Score**: A numeric value produced by the Priority_Scoring_Model used to rank Goals and Tasks.
- **Primary_KPI_Impact**: A normalized estimate, on a 0–100 scale, of a Goal or Task's contribution to the Primary_KPI.
- **Secondary_KPI_Impact**: A normalized estimate, on a 0–100 scale, of a Goal or Task's contribution to the Secondary_KPI.
- **Effort_Estimate**: A normalized estimate, on a 0–100 scale, of the work required to complete a Task.
- **Escalation_Rules**: PMO deliverable 5. The rules defining when and how the PMO raises items into the Escalation_Process.
- **Escalation_Process**: The existing CEO-OS deliverable defining Severity_Tiers, triggers, and the path for surfacing items to the Ghost CEO. The PMO-CS routes into it and does not replace it.
- **Escalation**: A flagged item requiring CEO attention, carrying a Severity_Tier.
- **Severity_Tier**: The P0 (critical), P1 (high), P2 (medium), or P3 (low) classification defined in the Escalation_Process.
- **Deduplication**: The PMO process of preventing duplicate Tasks across Departments.
- **Task_Fingerprint**: A deterministic identifier computed from a Task's normalized routing domain, objective, and target entity, used for Deduplication.
- **PMO_Progress_Report**: The dated PMO record that aggregates Task and Project status and rolls up into CEO reporting cadences.
- **Daily_Reporting_Framework**: The existing CEO-OS deliverable defining the daily report. PMO progress rolls into it.
- **Weekly_Review_Framework**: The existing CEO-OS deliverable defining the weekly review. PMO progress rolls into it.
- **Primary_KPI**: Monthly outbound clicks to Amazon via Amazon Associates, as defined in the CEO-OS KPI_Dashboard.
- **Secondary_KPI**: Pins published per week and Pinterest outbound clicks, as defined in the CEO-OS KPI_Dashboard.
- **Outbound_Click**: A click on an affiliate link that sends a visitor from the site or from Pinterest toward Amazon.
- **Operating_Day**: A calendar day on which the company runs its automated and review cadences, in UTC.
- **Data_Store**: The existing file-based, git-tracked JSON storage located under `data/`.
- **PMO_Endpoint**: A repo `/api/*` route handler that exposes PMO records for reading and writing under bearer or shared-secret authentication.
- **Stable_Identifier**: A persistent unique identifier on a PMO record that makes repeated writes idempotent.
- **Idempotent_Upsert**: A write keyed by a Stable_Identifier that updates an existing record when the identifier already exists and creates a new record otherwise.
- **n8n_Workflow**: An n8n workflow that orchestrates PMO operations by calling PMO_Endpoints, identified as WF-01, WF-02, WF-04, WF-04b, WF-04c, or WF-06.

## Requirements

### Requirement 1: PMO Operating Mandate

**User Story:** As the Ghost CEO, I want a coordination layer that sits below me and above the Departments, so that goals I set are executed across Departments without my direct involvement and without altering my role.

#### Acceptance Criteria

1. THE PMO_Coordination_System SHALL define the PMO responsibilities as receiving Goals from the Ghost CEO, decomposing Goals into Tasks, routing Tasks to Departments, tracking execution, reporting progress, and preventing duplicate work.
2. THE PMO_Coordination_System SHALL position the Project_Management_Office below the Ghost CEO and above the Departments in the operating hierarchy.
3. THE PMO_Coordination_System SHALL treat the Ghost CEO responsibilities defined in the CEO_Operating_System as authoritative and unchanged.
4. THE PMO_Coordination_System SHALL coordinate execution only across the Departments defined in the Department_Register.
5. THE PMO_Coordination_System SHALL identify its five deliverables as the Task_Routing_System, the Project_Tracking_Framework, the Department_Communication_Protocol, the Priority_Scoring_Model, and the Escalation_Rules.
6. THE PMO_Coordination_System SHALL reuse the Severity_Tiers, KPI definitions, Department names, and Data_Store conventions defined in the CEO_Operating_System.
7. THE PMO_Coordination_System SHALL store each of its records as a git-tracked JSON file under the Data_Store.

### Requirement 2: Goal Intake from the CEO

**User Story:** As the PMO, I want to ingest the CEO's ranked priorities as Goals, so that I coordinate execution against the direction the Ghost CEO has set.

#### Acceptance Criteria

1. WHEN the Ghost CEO records a priority in the Priority_Register, THE PMO_Coordination_System SHALL ingest the priority as a Goal.
2. THE PMO_Coordination_System SHALL record each Goal with a Stable_Identifier, the source priority identifier, a description, a target outcome, a linked KPI, and a rank.
3. THE PMO_Coordination_System SHALL preserve the rank order of the Priority_Register when recording Goals.
4. WHEN a priority is ingested whose source priority identifier matches an existing Goal, THE PMO_Coordination_System SHALL update the existing Goal rather than create an additional Goal.
5. IF a priority is ingested without a linked KPI, THEN THE PMO_Coordination_System SHALL record the Goal with the linked KPI marked as not set and SHALL raise an Escalation at Severity_Tier P3.
6. WHEN the Priority_Register re-ranks a priority, THE PMO_Coordination_System SHALL update the rank of the corresponding Goal to match the Priority_Register.

### Requirement 3: Goal Decomposition into Tasks

**User Story:** As the PMO, I want to break each Goal into executable Tasks, so that Departments receive clearly bounded units of work.

#### Acceptance Criteria

1. WHEN a Goal is ingested, THE PMO_Coordination_System SHALL decompose the Goal into one or more Tasks.
2. THE PMO_Coordination_System SHALL record each Task with a Stable_Identifier, the parent Goal identifier, an objective, a Routing_Domain, an owning Department, a Severity_Tier, a due date, a status, and a Priority_Score.
3. THE PMO_Coordination_System SHALL link every Task to exactly one parent Goal.
4. THE PMO_Coordination_System SHALL constrain each Task status to one of the values backlog, allocated, in-progress, blocked, in-review, or done, consistent with the Task_Allocation_System.
5. WHEN a Goal is decomposed a subsequent time, THE PMO_Coordination_System SHALL update the existing Tasks of that Goal rather than create duplicate Tasks for the same work.
6. THE PMO_Coordination_System SHALL assign every decomposed Task a status of backlog at the time of creation.

### Requirement 4: Task Routing System

**User Story:** As the PMO, I want deterministic routing rules keyed on Department charters, so that every Task is assigned to exactly one correct Department and the routing can run inside an n8n node.

#### Acceptance Criteria

1. THE Task_Routing_System SHALL assign each Task to exactly one owning Department.
2. THE Task_Routing_System SHALL derive each owning Department from the Department_Charter and Routing_Domain records in the Department_Register.
3. THE Task_Routing_System SHALL evaluate an ordered list of Routing_Rules and SHALL assign the Department of the first Routing_Rule whose match condition is satisfied.
4. FOR ALL Tasks that have identical routing inputs, THE Task_Routing_System SHALL assign the same owning Department.
5. IF no Routing_Rule matches a Task, THEN THE Task_Routing_System SHALL assign the Task to a PMO triage queue and SHALL raise an Escalation at Severity_Tier P3.
6. WHEN the Task_Routing_System assigns a Task, THE Task_Routing_System SHALL record the identifier of the Routing_Rule that produced the assignment.
7. THE Task_Routing_System SHALL route pin generation and Pinterest publishing Tasks to the Pinterest_Distribution Department.
8. THE Task_Routing_System SHALL route product and page production Tasks to the Content_and_Pages Department.
9. THE Task_Routing_System SHALL route n8n workflow orchestration Tasks to the Automation Department.
10. THE Task_Routing_System SHALL route trend and product discovery Tasks to the Discovery_Opportunity_Intelligence Department.
11. THE Task_Routing_System SHALL route schema, llms.txt, and AI-citability Tasks to the GEO_SEO_Citability Department.
12. THE Task_Routing_System SHALL route metrics and measurement Tasks to the Analytics_Reporting Department.
13. THE Task_Routing_System SHALL route FTC disclosure and Amazon Associates policy Tasks to the Compliance Department.
14. THE Task_Routing_System SHALL express each Routing_Rule as a JSON record that an n8n Code node or Switch node can evaluate without external state.

### Requirement 5: Project Tracking Framework

**User Story:** As the PMO, I want to track in-flight work, milestones, and status end to end, so that I always know the state of every Goal across Departments.

#### Acceptance Criteria

1. THE Project_Tracking_Framework SHALL group the Tasks decomposed from a single Goal under one Project linked to that Goal.
2. THE Project_Tracking_Framework SHALL record each Project with a Stable_Identifier, the linked Goal identifier, a set of Milestones, a status, and the set of owning Departments.
3. THE Project_Tracking_Framework SHALL record each Milestone with a Stable_Identifier, a description, a due date, a status, and a completion date.
4. WHEN a Task status changes, THE Project_Tracking_Framework SHALL recompute the status of the parent Project.
5. WHEN every Task associated with a Milestone reaches the status done, THE Project_Tracking_Framework SHALL mark the Milestone complete and record the completion date.
6. WHILE any Task under a Project has the status blocked, THE Project_Tracking_Framework SHALL display the Project as at-risk.
7. IF a Task passes its due date while its status is not done, THEN THE Project_Tracking_Framework SHALL mark the Task as overdue.
8. IF a Milestone passes its due date while its status is not complete, THEN THE Project_Tracking_Framework SHALL raise an Escalation at Severity_Tier P2.
9. THE Project_Tracking_Framework SHALL store each Project and each Milestone as a git-tracked JSON record under the Data_Store keyed by its Stable_Identifier.

### Requirement 6: Department Communication Protocol

**User Story:** As the PMO, I want a structured message and handoff format between the PMO and Departments and between Departments, so that assignments, handoffs, and status updates are consistent and machine-readable.

#### Acceptance Criteria

1. THE Department_Communication_Protocol SHALL define a Coordination_Message structure containing a Stable_Identifier, a UTC timestamp, a sender, a recipient, a message type, a related Task or Project identifier, a payload, and a status.
2. THE Department_Communication_Protocol SHALL constrain the message type to one of the values assignment, handoff, status-update, blocker, info-request, or response.
3. THE Department_Communication_Protocol SHALL constrain the sender and the recipient to a Department defined in the Department_Register or to the Project_Management_Office.
4. WHEN the PMO routes a Task to a Department, THE Department_Communication_Protocol SHALL emit an assignment Coordination_Message addressed to that Department.
5. WHEN a Department transfers work to another Department, THE Department_Communication_Protocol SHALL emit a handoff Coordination_Message that references both Departments and the related Task.
6. IF a Coordination_Message has a sender or recipient that is not a defined Department or the Project_Management_Office, THEN THE Department_Communication_Protocol SHALL reject the Coordination_Message and return a validation error.
7. THE Department_Communication_Protocol SHALL serialize each Coordination_Message as a JSON record stored under the Data_Store keyed by its Stable_Identifier.
8. WHEN a Coordination_Message is serialized to JSON and then read back from the Data_Store, THE Department_Communication_Protocol SHALL produce a Coordination_Message equivalent to the original.

### Requirement 7: Priority Scoring Model

**User Story:** As the PMO, I want a quantitative scoring model that favors outbound-click metrics, so that I rank Goals and Tasks by their expected contribution to revenue rather than vanity metrics.

#### Acceptance Criteria

1. THE Priority_Scoring_Model SHALL compute a numeric Priority_Score for each Goal and each Task.
2. THE Priority_Scoring_Model SHALL compute the Priority_Score from the Primary_KPI_Impact, the Secondary_KPI_Impact, the Severity_Tier, and the Effort_Estimate.
3. THE Priority_Scoring_Model SHALL weight the Primary_KPI_Impact with a coefficient greater than the coefficient applied to the Secondary_KPI_Impact, and SHALL weight the Secondary_KPI_Impact with a coefficient greater than zero.
4. THE Priority_Scoring_Model SHALL exclude raw pageviews from the inputs used to compute the Priority_Score.
5. FOR ALL inputs, THE Priority_Scoring_Model SHALL produce the same Priority_Score whenever the inputs are identical.
6. WHEN the Primary_KPI_Impact of a Task increases while its other inputs are unchanged, THE Priority_Scoring_Model SHALL produce a Priority_Score that is greater than or equal to the previous Priority_Score.
7. WHEN one normalized unit is added to the Primary_KPI_Impact and separately one normalized unit is added to the Secondary_KPI_Impact of the same Task, THE Priority_Scoring_Model SHALL increase the Priority_Score more for the Primary_KPI_Impact addition than for the Secondary_KPI_Impact addition.
8. THE Priority_Scoring_Model SHALL rank Goals and Tasks in descending order of Priority_Score.
9. WHEN two Tasks have an equal Priority_Score, THE Priority_Scoring_Model SHALL order the Task with the higher Primary_KPI_Impact first, and SHALL order by the Stable_Identifier when the Primary_KPI_Impact is also equal.
10. THE Priority_Scoring_Model SHALL record the computed Priority_Score on the corresponding Goal or Task record.

### Requirement 8: Deduplication of Work

**User Story:** As the PMO, I want to detect and prevent duplicate Tasks across Departments, so that two Departments do not perform the same work.

#### Acceptance Criteria

1. THE PMO_Coordination_System SHALL compute a deterministic Task_Fingerprint from the normalized Routing_Domain, objective, and target entity of a Task.
2. FOR ALL Tasks that have identical normalized Routing_Domain, objective, and target entity, THE PMO_Coordination_System SHALL compute the same Task_Fingerprint.
3. WHEN a Task is created whose Task_Fingerprint matches an open Task, THE PMO_Coordination_System SHALL reuse the existing Task instead of creating an additional Task.
4. WHEN the PMO_Coordination_System checks a Task_Fingerprint, THE PMO_Coordination_System SHALL compare the new Task against open Tasks across all Departments.
5. WHERE two open Tasks in different Departments share a Task_Fingerprint, THE PMO_Coordination_System SHALL raise an Escalation at Severity_Tier P3 to consolidate the Tasks.
6. WHEN the same Task creation request is submitted more than once with identical inputs, THE PMO_Coordination_System SHALL hold the count of resulting Tasks at one.

### Requirement 9: Escalation Rules

**User Story:** As the PMO, I want clear rules for escalating into the CEO's escalation process, so that critical blockers reach the Ghost CEO promptly while routine matters stay within the Departments.

#### Acceptance Criteria

1. THE Escalation_Rules SHALL reuse the Severity_Tiers P0, P1, P2, and P3 defined in the Escalation_Process.
2. THE Escalation_Rules SHALL route every PMO Escalation into the CEO Escalation_Process.
3. THE Escalation_Rules SHALL record each Escalation with a Stable_Identifier, a Severity_Tier, the originating Department, the related Task or Project identifier, a description, and a status.
4. THE Escalation_Rules SHALL constrain each Escalation status to one of the values open, in-review, decided, or closed.
5. IF a Task in the Compliance Routing_Domain reports an FTC disclosure or Amazon Associates policy violation, THEN THE Escalation_Rules SHALL classify the Escalation at Severity_Tier P0.
6. IF a Task status is blocked for two or more consecutive Operating_Days, THEN THE Escalation_Rules SHALL raise an Escalation at Severity_Tier P1.
7. WHEN an Escalation at Severity_Tier P0 is created, THE Escalation_Rules SHALL require a Ghost CEO decision before dependent work proceeds, consistent with the Escalation_Process.
8. WHEN an Escalation is raised, THE Escalation_Rules SHALL route the Escalation to the owning Department defined in the Department_Register.
9. WHEN an Escalation is raised whose Stable_Identifier matches an open Escalation, THE Escalation_Rules SHALL update the existing Escalation rather than create an additional Escalation.

### Requirement 10: Progress Reporting and Roll-up

**User Story:** As the PMO, I want to roll progress up into the CEO reporting cadences, so that the Ghost CEO reviews coordinated, department-level progress in the existing report formats.

#### Acceptance Criteria

1. THE PMO_Coordination_System SHALL produce a PMO_Progress_Report that aggregates Task and Project status by Department.
2. THE PMO_Progress_Report SHALL include the count of Tasks by status for each Department, Milestone completion, open Escalations grouped by Severity_Tier, and the Primary_KPI and Secondary_KPI contribution.
3. THE PMO_Coordination_System SHALL roll the PMO_Progress_Report up into the Daily_Reporting_Framework and the Weekly_Review_Framework.
4. THE PMO_Progress_Report SHALL cover the period ending at the start of each Operating_Day in UTC.
5. THE PMO_Progress_Report SHALL exclude raw pageviews from the KPIs that carry targets.
6. IF a Department has no Task activity for an Operating_Day, THEN THE PMO_Progress_Report SHALL record that Department as having no activity for that Operating_Day.
7. THE PMO_Coordination_System SHALL store each PMO_Progress_Report as a dated, git-tracked JSON record under the Data_Store keyed by its Stable_Identifier.

### Requirement 11: n8n Integration, Endpoints, and Idempotency

**User Story:** As the operator, I want every PMO operation to be reachable and safe to repeat from n8n, so that the automation layer can orchestrate coordination without owning data or creating duplicates.

#### Acceptance Criteria

1. THE PMO_Coordination_System SHALL expose its records through PMO_Endpoints under the repo `/api/` path.
2. THE PMO_Endpoints SHALL validate a bearer token or a shared-secret header before performing any write.
3. IF a PMO_Endpoint receives a request without a valid bearer token or shared-secret header, THEN THE PMO_Endpoint SHALL return an unauthorized response and perform no write.
4. IF a PMO_Endpoint receives invalid or empty JSON, THEN THE PMO_Endpoint SHALL return a bad-request response and perform no write.
5. THE PMO_Endpoints SHALL perform Idempotent_Upserts keyed by a Stable_Identifier so that repeated writes for the same record update the existing record rather than create a duplicate.
6. THE PMO_Coordination_System SHALL store all PMO records as git-tracked JSON under the Data_Store.
7. THE PMO_Endpoints SHALL support invocation by an n8n_Workflow on a schedule and by an n8n_Workflow webhook.
8. WHEN a scheduled coordination run is invoked, THE PMO_Coordination_System SHALL ingest new Goals from the Priority_Register, run routing, and recompute Priority_Scores.
9. WHERE a PMO_Endpoint cannot persist a record to the local filesystem, THE PMO_Endpoint SHALL return a response indicating that persistence did not occur rather than fail the request, consistent with the existing `/api/*` ingest behavior.
10. THE Task_Routing_System SHALL provide its Routing_Rules in a form that an n8n Code node or Switch node can execute deterministically.
