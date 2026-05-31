# Requirements Document

## Introduction

The CEO Operating System (CEO-OS) is the management and operating framework through which the Ghost CEO runs Ghost Corporation — the operating company behind the Summer Finds Lab Daily affiliate engine. The Ghost CEO does not execute production work directly; the CEO defines priorities, allocates tasks, monitors departments, reviews reports, detects bottlenecks, and decides escalations. Execution is performed by AI-agent departments (Kiro in Autopilot plus the n8n automation layer).

This specification defines the requirements for six concrete, implementation-ready deliverables:

1. **CEO Operating System** — the overall operating model and cadence loop that governs how the CEO runs the company.
2. **Weekly Review Framework** — the structured weekly cadence for evaluating outcomes and re-prioritizing.
3. **Daily Reporting Framework** — the structured daily report each department produces and the CEO reviews.
4. **KPI Dashboard** — the single surface that tracks the metrics that maximize traffic, clicks, and revenue.
5. **Department Structure** — the named departments, their charters, owners, and inputs/outputs.
6. **Escalation Process** — the severity-tiered path for surfacing decisions and blockers to the CEO.

The system is intentionally optimized for the project's primary success metric — **monthly outbound clicks to Amazon** (Amazon Associates) — and its secondary metrics — **pins published per week** and **Pinterest outbound clicks** — and is deliberately NOT optimized for raw pageviews. The CEO-OS is file-based and git-tracked, consistent with the wider project architecture, and consumes operational data from the existing `/api/analytics` and `/api/opportunities` endpoints.

## Glossary

- **Ghost CEO**: The solo human operator acting as Chief Executive of Ghost Corporation. Responsible for direction and decisions, not execution.
- **Ghost Corporation**: The operating company that runs the Summer Finds Lab Daily affiliate engine.
- **CEO_Operating_System**: The umbrella framework comprising the operating model, cadences, dashboard, department structure, and escalation process. Also referred to as CEO-OS.
- **Operating_Model**: The deliverable that documents how the CEO runs the company end to end, including the recurring decision loop and the rules for delegation and review.
- **Department**: A functional area of the company executed by one or more AI agents. The seven departments are defined in the Department Register.
- **Department_Register**: The authoritative record of all departments, their charters, owners, primary KPIs, and data sources.
- **AI_Agent_Employee**: A non-human worker (Kiro Autopilot capability or an n8n workflow) assigned to a department to perform execution work.
- **Priority_Register**: The authoritative, ranked record of current company priorities and their target outcomes.
- **Task_Allocation_System**: The deliverable that governs how the CEO delegates tasks to departments and tracks their status.
- **Task**: A unit of delegated work with an owning department, an objective, a due date, and a status.
- **Daily_Reporting_Framework**: The deliverable defining the daily report structure, schedule, and review rules.
- **Daily_Report**: The dated record produced by departments each operating day and reviewed by the CEO.
- **Weekly_Review_Framework**: The deliverable defining the weekly review agenda, schedule, inputs, and outputs.
- **Weekly_Review_Record**: The dated record produced by each weekly review.
- **KPI_Dashboard**: The deliverable that aggregates and displays the company's key performance indicators.
- **KPI**: Key Performance Indicator. A named, measurable metric with a definition, a source, and a target.
- **Primary_KPI**: Monthly outbound clicks to Amazon via Amazon Associates.
- **Secondary_KPI**: Pins published per week and Pinterest outbound clicks.
- **Outbound_Click**: A click on an affiliate link that sends a visitor from the site or from Pinterest toward Amazon.
- **Bottleneck_Detector**: The deliverable and rules that identify departments or tasks that are constraining company throughput.
- **Bottleneck**: A department, task, or dependency that is measurably limiting progress toward a Primary_KPI or Secondary_KPI.
- **Escalation_Process**: The deliverable defining severity tiers, triggers, and the path for surfacing items requiring CEO decision.
- **Escalation**: A flagged item requiring CEO attention or decision, carrying a severity tier.
- **Severity_Tier**: The classification of an escalation as P0 (critical), P1 (high), P2 (medium), or P3 (low), consistent with the project task queue.
- **Operating_Day**: A calendar day on which the company runs its automated and review cadences.
- **Analytics_Endpoint**: The existing `/api/analytics/latest` route that exposes ingested site analytics data.
- **Opportunities_Endpoint**: The existing `/api/opportunities/latest` route that exposes the daily Opportunity Intelligence report.
- **Opportunity_Intelligence**: The daily scored report produced by the n8n WF-06 workflow at 06:00 UTC.
- **Pinterest_Publishing_Run**: The daily Pinterest publishing cycle produced by the n8n WF-04 workflow at 09:00 UTC.
- **Data_Store**: The file-based, git-tracked JSON storage used by the company, located under `data/`.
- **Compliance_Department**: The department responsible for FTC disclosure and Amazon Associates policy adherence.

## Requirements

### Requirement 1: CEO Operating Model

**User Story:** As the Ghost CEO, I want a documented operating model that defines how I run the company through a recurring decision loop, so that I direct and decide without executing production work directly.

#### Acceptance Criteria

1. THE CEO_Operating_System SHALL provide an Operating_Model document that defines the CEO responsibilities as defining priorities, allocating tasks, monitoring departments, reviewing reports, detecting bottlenecks, deciding escalations, and maximizing traffic, clicks, and revenue.
2. THE Operating_Model SHALL define a recurring decision loop with the ordered stages prioritize, delegate, monitor, review, and decide.
3. THE Operating_Model SHALL state that the Ghost CEO performs direction and decision activities and SHALL state that AI_Agent_Employees perform execution activities.
4. THE Operating_Model SHALL reference the Primary_KPI as the company's top-ranked objective and the Secondary_KPI as the leading indicators that feed the Primary_KPI.
5. THE Operating_Model SHALL identify each of the six CEO-OS deliverables and SHALL state the cadence that governs each deliverable.
6. THE Operating_Model SHALL record a time reference in UTC for each deliverable cadence.
7. WHERE a deliverable defines a recurring cadence, THE Operating_Model SHALL additionally record the cadence interval.
8. THE Operating_Model SHALL be stored as a git-tracked file within the CEO-OS deliverable set.

### Requirement 2: Priority Definition and Management

**User Story:** As the Ghost CEO, I want to define and maintain a ranked set of company priorities, so that departments execute work in the order that most increases traffic, clicks, and revenue.

#### Acceptance Criteria

1. THE Priority_Register SHALL record each priority with a unique identifier, a description, a target outcome, an owning Department, and a rank.
2. THE Priority_Register SHALL order priorities by rank such that no two active priorities share the same rank.
3. WHEN the Ghost CEO defines a new priority, THE Priority_Register SHALL record the priority with its rank and an associated target outcome.
4. THE Priority_Register SHALL link each priority to at least one KPI that the priority is intended to improve.
5. WHERE a priority is intended to improve revenue, THE Priority_Register SHALL link the priority to the Primary_KPI or a Secondary_KPI.
6. WHEN the Ghost CEO re-ranks priorities, THE Priority_Register SHALL preserve a dated record of the previous ranking.
7. THE Priority_Register SHALL be stored as a git-tracked file within the CEO-OS deliverable set.

### Requirement 3: Task Allocation and Delegation

**User Story:** As the Ghost CEO, I want to delegate tasks to departments and track their status, so that work is assigned to AI-agent employees and progress is visible without my direct execution.

#### Acceptance Criteria

1. THE Task_Allocation_System SHALL record each Task with a unique identifier, an objective, an owning Department, a Severity_Tier, a due date, and a status.
2. THE Task_Allocation_System SHALL constrain each Task status to one of the values backlog, allocated, in-progress, blocked, in-review, or done.
3. WHEN the Ghost CEO allocates a Task, THE Task_Allocation_System SHALL assign the Task to exactly one owning Department.
4. THE Task_Allocation_System SHALL link each Task to the priority it advances.
5. WHEN a Task is allocated, THE Task_Allocation_System SHALL record the allocation date and the due date.
6. WHILE a Task status is blocked, THE Task_Allocation_System SHALL record the identifier of the dependency that is blocking the Task.
7. THE Task_Allocation_System SHALL be stored as a git-tracked file within the CEO-OS deliverable set.

### Requirement 4: Department Structure

**User Story:** As the Ghost CEO, I want a defined department structure mapped to the company's functional areas, so that I can monitor and delegate to clearly bounded units staffed by AI-agent employees.

#### Acceptance Criteria

1. THE Department_Register SHALL define the departments Content_and_Pages, Pinterest_Distribution, Automation, GEO_SEO_Citability, Discovery_Opportunity_Intelligence, Analytics_Reporting, and Compliance.
2. THE Department_Register SHALL record for each Department a charter, an assigned set of AI_Agent_Employees, a primary KPI, and a data source.
3. THE Department_Register SHALL map the Automation Department to the n8n workflows WF-01, WF-02, WF-04, and WF-06.
4. THE Department_Register SHALL map the Discovery_Opportunity_Intelligence Department to the Opportunities_Endpoint as its data source.
5. THE Department_Register SHALL map the Analytics_Reporting Department to the Analytics_Endpoint as its data source.
6. THE Department_Register SHALL assign the Compliance Department responsibility for FTC disclosure adherence and Amazon Associates policy adherence.
7. THE Department_Register SHALL link each Department primary KPI to a KPI defined in the KPI_Dashboard.
8. THE Department_Register SHALL be stored as a git-tracked file within the CEO-OS deliverable set.

### Requirement 5: Department Monitoring

**User Story:** As the Ghost CEO, I want to monitor each department against its KPI and task status, so that I can tell which departments are on track without executing their work.

#### Acceptance Criteria

1. THE CEO_Operating_System SHALL present, for each Department, the current value of the Department primary KPI and the count of open Tasks by status.
2. WHEN a Daily_Report is reviewed, THE CEO_Operating_System SHALL associate each reported item with its owning Department.
3. IF a Department has no Daily_Report for an Operating_Day, THEN THE CEO_Operating_System SHALL flag the Department as not reporting for that Operating_Day regardless of outage or maintenance conditions.
4. WHEN a Department submits a Daily_Report for an Operating_Day, THE CEO_Operating_System SHALL display the Department as reporting for that Operating_Day.
5. WHERE a Department primary KPI has a defined target, THE CEO_Operating_System SHALL display the variance between the current value and the target.
6. THE CEO_Operating_System SHALL derive Department monitoring values from the Data_Store, the Analytics_Endpoint, and the Opportunities_Endpoint.

### Requirement 6: Daily Reporting Framework

**User Story:** As the Ghost CEO, I want a standardized daily report from each department, so that I can review progress, clicks, and blockers every operating day in a consistent format.

#### Acceptance Criteria

1. THE Daily_Reporting_Framework SHALL define a Daily_Report structure containing the report date, the owning Department, completed work, in-progress work, blockers, and the Department primary KPI value for the day.
2. THE Daily_Reporting_Framework SHALL schedule the Daily_Report to cover the period ending at the start of each Operating_Day in UTC.
3. THE Daily_Reporting_Framework SHALL require the Daily_Report to include the day's outbound-click figures sourced from the Analytics_Endpoint.
4. THE Daily_Reporting_Framework SHALL require the Discovery_Opportunity_Intelligence Daily_Report to include the day's Opportunity_Intelligence summary sourced from the Opportunities_Endpoint.
5. WHEN a Daily_Report records a blocker, THE Daily_Reporting_Framework SHALL require the blocker to carry a Severity_Tier.
6. IF a Daily_Report records a blocker with Severity_Tier P0 or P1, THEN THE Daily_Reporting_Framework SHALL require the blocker to be raised to the Escalation_Process.
7. THE Daily_Reporting_Framework SHALL store each Daily_Report as a dated, git-tracked file within the CEO-OS deliverable set.

### Requirement 7: Weekly Review Framework

**User Story:** As the Ghost CEO, I want a structured weekly review, so that I can evaluate weekly outcomes against KPIs and re-prioritize the company for the coming week.

#### Acceptance Criteria

1. THE Weekly_Review_Framework SHALL define a Weekly_Review_Record structure containing the review date, the Primary_KPI trend, the Secondary_KPI trend, department performance, identified bottlenecks, and re-prioritization decisions.
2. THE Weekly_Review_Framework SHALL schedule the weekly review to occur once per calendar week on a fixed weekday recorded in UTC.
3. THE Weekly_Review_Framework SHALL require the weekly review to compare each KPI value against its value from the prior week.
4. THE Weekly_Review_Framework SHALL require the weekly review to summarize pins published during the week and Pinterest outbound clicks during the week.
5. WHEN the weekly review identifies that a Primary_KPI or Secondary_KPI has declined relative to the prior week, THE Weekly_Review_Framework SHALL require a corrective priority to be recorded in the Priority_Register.
6. THE Weekly_Review_Framework SHALL require the weekly review to confirm or update the rank of every active priority in the Priority_Register.
7. THE Weekly_Review_Framework SHALL store each Weekly_Review_Record as a dated, git-tracked file within the CEO-OS deliverable set.

### Requirement 8: KPI Dashboard

**User Story:** As the Ghost CEO, I want a single KPI dashboard centered on outbound clicks and revenue, so that I can decide where to direct the company to maximize traffic, clicks, and revenue.

#### Acceptance Criteria

1. THE KPI_Dashboard SHALL define each KPI with a name, a definition, a data source, a target, and a measurement period.
2. THE KPI_Dashboard SHALL designate monthly outbound clicks to Amazon as the Primary_KPI.
3. THE KPI_Dashboard SHALL designate pins published per week and Pinterest outbound clicks as the Secondary_KPI.
4. THE KPI_Dashboard SHALL exclude raw pageviews from the set of KPIs that carry targets.
5. THE KPI_Dashboard SHALL source outbound-click and site-engagement values from the Analytics_Endpoint, except for outbound clicks that represent product opportunities, which THE KPI_Dashboard SHALL source from the Opportunities_Endpoint.
6. THE KPI_Dashboard SHALL source product-opportunity values from the Opportunities_Endpoint.
7. WHERE a KPI has a defined target, THE KPI_Dashboard SHALL display the current value, the target value, and the variance between them.
8. WHERE a KPI has no defined target, THE KPI_Dashboard SHALL display the current value and SHALL display the target and variance as not set.
9. WHEN the underlying data for a KPI is updated, THE KPI_Dashboard SHALL display the timestamp of the most recent data used for that KPI.
10. IF a KPI data source returns no data for the current measurement period, THEN THE KPI_Dashboard SHALL display the KPI as data-unavailable rather than as a zero value.

### Requirement 9: Bottleneck Detection

**User Story:** As the Ghost CEO, I want bottlenecks detected against measurable rules, so that I can act on the constraints that most limit clicks and revenue.

#### Acceptance Criteria

1. THE Bottleneck_Detector SHALL evaluate each Department and each open Task against the bottleneck rules during every weekly review.
2. IF an allocated Task remains past its due date while its status is not done, THEN THE Bottleneck_Detector SHALL flag the Task as a Bottleneck.
3. IF a Department primary KPI declines across two consecutive measurement periods, THEN THE Bottleneck_Detector SHALL flag the Department as a Bottleneck.
4. WHEN a Task status changes to blocked, THE Bottleneck_Detector SHALL count the day of the status change as the first blocked Operating_Day.
5. IF a Task status is blocked for two or more consecutive Operating_Days, THEN THE Bottleneck_Detector SHALL flag the Task as a Bottleneck.
6. WHEN the Bottleneck_Detector flags a Bottleneck, THE Bottleneck_Detector SHALL record the affected Department, the affected KPI, and the rule that triggered the flag.
7. WHEN a Bottleneck is flagged, THE Bottleneck_Detector SHALL raise the Bottleneck to the Escalation_Process with a Severity_Tier.

### Requirement 10: Escalation Process

**User Story:** As the Ghost CEO, I want a severity-tiered escalation process, so that critical blockers and decisions reach me promptly while routine matters stay with the departments.

#### Acceptance Criteria

1. THE Escalation_Process SHALL define the Severity_Tiers P0, P1, P2, and P3 with a written definition and a CEO response expectation for each tier.
2. THE Escalation_Process SHALL record each Escalation with a unique identifier, a Severity_Tier, the originating Department, a description, and a status.
3. WHEN a Compliance violation of FTC disclosure or Amazon Associates policy is reported, THE Escalation_Process SHALL classify the Escalation as Severity_Tier P0.
4. WHEN an Escalation of Severity_Tier P0 is created, THE Escalation_Process SHALL require CEO decision before dependent work proceeds.
5. IF a P0 Escalation remains undecided beyond a defined timeout period, THEN THE Escalation_Process SHALL allow dependent work to proceed under a designated backup decision-maker.
6. THE Escalation_Process SHALL constrain each Escalation status to one of the values open, in-review, decided, or closed.
7. WHEN the Ghost CEO decides an Escalation, THE Escalation_Process SHALL record the decision, the decision date, and any resulting Task or priority.
8. THE Escalation_Process SHALL route an Escalation to the owning Department defined in the Department_Register.
9. THE Escalation_Process SHALL store each Escalation as a git-tracked record within the CEO-OS deliverable set.

### Requirement 11: Revenue and Traffic Maximization Loop

**User Story:** As the Ghost CEO, I want the operating cadences to drive decisions toward the metrics that produce revenue, so that prioritization consistently favors outbound clicks over vanity metrics.

#### Acceptance Criteria

1. WHEN the Ghost CEO ranks priorities, THE CEO_Operating_System SHALL order a priority that improves the Primary_KPI above a priority that improves only a non-KPI metric.
2. THE CEO_Operating_System SHALL require every weekly review to produce at least one decision that targets the Primary_KPI or a Secondary_KPI.
3. WHERE two candidate priorities target the same KPI, THE CEO_Operating_System SHALL rank by the expected improvement to outbound clicks recorded for each candidate, and THE CEO_Operating_System SHALL allow a candidate with zero expected improvement to be ranked and selected.
4. THE CEO_Operating_System SHALL exclude raw pageviews from the metrics used to justify a priority's rank.
5. WHEN the Primary_KPI meets or exceeds its target for a measurement period, THE CEO_Operating_System SHALL record the contributing departments in the Weekly_Review_Record.

### Requirement 12: Data Integration and Persistence

**User Story:** As the Ghost CEO, I want the operating system to consume the existing data sources and persist its own records, so that the framework stays consistent with the project's file-based, git-tracked architecture.

#### Acceptance Criteria

1. THE CEO_Operating_System SHALL read site analytics data from the Analytics_Endpoint.
2. THE CEO_Operating_System SHALL read product-opportunity data from the Opportunities_Endpoint.
3. THE CEO_Operating_System SHALL store its Priority_Register, Task records, Daily_Report records, Weekly_Review_Record records, and Escalation records as git-tracked JSON files under the Data_Store.
4. IF the Analytics_Endpoint or the Opportunities_Endpoint is unavailable when a report or dashboard is produced, THEN THE CEO_Operating_System SHALL record the affected KPI as data-unavailable and SHALL continue producing the remainder of the output.
5. WHEN a CEO-OS record is created or updated, THE CEO_Operating_System SHALL store the record using a stable unique identifier so that repeated writes for the same record update the existing record rather than create a duplicate.
