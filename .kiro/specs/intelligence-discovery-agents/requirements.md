# Requirements Document

## Introduction

The Intelligence Discovery Agents (IDA) are the AI-agent employees that staff the existing **Discovery_Opportunity_Intelligence** Department of Ghost Corporation — the operating company behind the Summer Finds Lab Daily affiliate engine. This specification defines five discovery agents whose shared mission, set by the Director of Intelligence, is to **discover profitable opportunities before competitors**. Opportunities are optimized toward the company **Primary_KPI — monthly outbound clicks to Amazon** — and the **Secondary_KPI — pins published per week plus Pinterest outbound clicks** — and are deliberately NOT optimized for raw pageviews.

This specification is consistent with, and depends on, two sibling specifications and the project bible. It does **not** redefine the Ghost CEO or the PMO; it specifies the agents that execute trend and product discovery work the PMO already routes to this Department:

- **CEO Operating System** (`.kiro/specs/ceo-operating-system/requirements.md`) — defines the seven Departments (including Discovery_Opportunity_Intelligence), the Primary_KPI and Secondary_KPI, the P0–P3 Severity_Tiers, the Opportunities_Endpoint (`/api/opportunities/latest`), and the file-based, git-tracked JSON Data_Store under `data/`.
- **PMO Coordination System** (`.kiro/specs/pmo-coordination-system/requirements.md`) — routes trend and product discovery Tasks to the Discovery_Opportunity_Intelligence Department, defines the Priority_Scoring_Model and the n8n endpoint/idempotency conventions.
- **PROJECT_BIBLE.md** — defines the existing WF-06 Opportunity Intelligence workflow (schedule 06:00 UTC + manual, Firecrawl `/v2/scrape` against Pinterest Trends and Amazon Movers & Shakers, deterministic 0–100 scoring, daily report POSTed to `/api/opportunities/ingest` with bearer auth `OPPORTUNITY_INGEST_TOKEN`, readable at `/api/opportunities/latest`), the fixed 7-category taxonomy, the canonical Product schema, ADR-008 (Firecrawl as the discovery scraper), ADR-006 (Claude for analysis), and ADR-009 (n8n orchestrates, never owns data).

The five agents are:

1. **Trend Hunter Agent** — discovers trending summer topics, keywords, and themes from Pinterest Trends and broader trend signals via Firecrawl.
2. **Product Hunter Agent** — discovers specific trending Amazon products (Amazon Movers & Shakers / best-sellers via Firecrawl) suitable for the summer catalog, with affiliate links.
3. **Competitor Intelligence Agent** — monitors competitor affiliate sites, pins, and rankings to find coverage gaps and winning angles.
4. **Niche Discovery Agent** — finds underserved sub-niches and long-tail clusters within the strictly-summer scope (the 7 fixed categories).
5. **Opportunity Scoring Agent** — scores and ranks discovered opportunities 0–100 (consistent with the existing WF-06 scoring and the Opportunities_Endpoint) and produces the daily opportunity report the rest of the company consumes.

For each agent this document specifies its Objective, Inputs, Outputs, Workflow, KPIs, Memory usage (the persistent git-tracked state it reads and writes across runs), and n8n integration. Cross-cutting requirements then define the shared opportunity data model, scoring consistency, memory and deduplication, n8n integration and idempotency, and KPI alignment. Discovery is woven throughout three focus areas: **Pinterest distribution, SEO/GEO citability, and Amazon affiliate opportunities**.

## Glossary

- **Ghost CEO**: The solo human operator acting as Chief Executive of Ghost Corporation, defined in the CEO Operating System. Not redefined here.
- **Director_of_Intelligence**: The role accountable for the Discovery_Opportunity_Intelligence Department and the mission of discovering profitable opportunities before competitors. Operates below the Ghost CEO and is coordinated by the PMO.
- **Discovery_Opportunity_Intelligence**: The existing Department, defined in the CEO Operating System Department_Register, that the five Discovery_Agents staff. Its data source is the Opportunities_Endpoint.
- **Discovery_Agent**: An AI_Agent_Employee of the Discovery_Opportunity_Intelligence Department. The five Discovery_Agents are the Trend_Hunter_Agent, the Product_Hunter_Agent, the Competitor_Intelligence_Agent, the Niche_Discovery_Agent, and the Opportunity_Scoring_Agent.
- **AI_Agent_Employee**: A non-human worker (a Kiro Autopilot capability or an n8n workflow plus repo business logic) assigned to a Department, as defined in the CEO Operating System.
- **Trend_Hunter_Agent**: Discovery_Agent 1. Discovers trending summer topics, keywords, and themes.
- **Product_Hunter_Agent**: Discovery_Agent 2. Discovers specific trending Amazon products suitable for the summer catalog.
- **Competitor_Intelligence_Agent**: Discovery_Agent 3. Monitors competitor affiliate properties to find coverage gaps and winning angles.
- **Niche_Discovery_Agent**: Discovery_Agent 4. Finds underserved sub-niches and long-tail clusters within the fixed summer taxonomy.
- **Opportunity_Scoring_Agent**: Discovery_Agent 5. Scores and ranks opportunities 0–100 and produces the Daily_Opportunity_Report.
- **Opportunity**: A discovered, actionable item — a trend, a product, a competitor gap, or a niche cluster — recorded as an Opportunity_Record carrying an Opportunity_Score.
- **Opportunity_Record**: The canonical JSON record for a single Opportunity, stored under the Data_Store and keyed by a Stable_Identifier.
- **Opportunity_Type**: The kind of an Opportunity, constrained to one of trend, product, competitor-gap, or niche.
- **Opportunity_Score**: An integer from 0 to 100 expressing an Opportunity's expected contribution to the Primary_KPI and Secondary_KPI, computed by the Opportunity_Scoring_Agent.
- **Pinterest_Potential_Score**: A 0–100 sub-score expressing an Opportunity's Pinterest distribution potential, consistent with the existing WF-06 Pinterest axis.
- **Affiliate_Potential_Score**: A 0–100 sub-score expressing an Opportunity's Amazon affiliate conversion potential, consistent with the existing WF-06 affiliate axis.
- **GEO_Citability_Score**: A 0–100 sub-score expressing an Opportunity's SEO/GEO citability potential (likelihood of being surfaced or cited by AI answer engines and search).
- **Daily_Opportunity_Report**: The dated report produced by the Opportunity_Scoring_Agent, POSTed to the Opportunity_Ingest_Endpoint and served at the Opportunities_Endpoint, consistent with the existing WF-06 report.
- **Category_Slug**: One of the seven fixed taxonomy slugs: summer-gadgets, beach-essentials, tiktok-finds, aesthetic-room, travel, skincare-summer, pet-summer.
- **Summer_Scope**: The constraint that all discovered Opportunities map to the fixed 7-category taxonomy and the summer-only brand scope (ADR-010).
- **Product**: The canonical product entity defined in `lib/types.ts` with fields including id, title, brand, price, rating, category, tags, asin, and affiliateUrl.
- **Product_Tag**: One of the allowed product tags: trending, tiktok, under-25, or viral.
- **Coverage_Gap**: A trending keyword, product, or sub-niche within Summer_Scope for which the catalog currently has no, or insufficient, Product coverage.
- **Competitor_Property**: A competitor affiliate site, Pinterest profile, board, pin, or ranked search result monitored by the Competitor_Intelligence_Agent.
- **Winning_Angle**: A content, format, or positioning pattern observed on a Competitor_Property that correlates with distribution or ranking success.
- **Long_Tail_Cluster**: A group of related low-competition long-tail keywords within a single Category_Slug, identified by the Niche_Discovery_Agent.
- **Trend_Signal**: A normalized trend observation (keyword, theme, or category) with a source, a captured timestamp, and a momentum indicator.
- **Momentum**: The day-over-day change in an Opportunity's score or signal strength relative to the prior run, indicating whether it is rising, flat, or falling.
- **Firecrawl**: The scraping service (`/v2/scrape`) used for trend and product discovery, per ADR-008.
- **Claude**: The Anthropic model used for analysis and brief generation, per ADR-006 (Opus default; a cheaper model for high-volume tasks).
- **Primary_KPI**: Monthly outbound clicks to Amazon via Amazon Associates, as defined in the CEO Operating System KPI_Dashboard.
- **Secondary_KPI**: Pins published per week and Pinterest outbound clicks, as defined in the CEO Operating System KPI_Dashboard.
- **Outbound_Click**: A click on an affiliate link that sends a visitor from the site or from Pinterest toward Amazon.
- **Data_Store**: The existing file-based, git-tracked JSON storage located under `data/`.
- **Memory_Store**: The subset of the Data_Store, under `data/opportunities/`, holding the persistent state files (such as seen-trends, seen-products, competitor snapshots, and scoring history) that Discovery_Agents read and write across runs.
- **Memory_State_File**: A single git-tracked JSON file within the Memory_Store that an agent reads at the start of a run and writes at the end of a run to persist state across runs.
- **Seen_Index**: A Memory_State_File that records the Stable_Identifiers of previously surfaced Opportunities and the date each was last seen, used to avoid re-surfacing the same Opportunity.
- **Scoring_History**: A Memory_State_File that records prior Opportunity_Scores by Stable_Identifier and date, used to compute Momentum.
- **Stable_Identifier**: A deterministic, persistent unique identifier on an Opportunity_Record that makes repeated writes idempotent.
- **Opportunity_Fingerprint**: A deterministic identifier computed from an Opportunity's normalized Opportunity_Type, primary keyword or target entity, and Category_Slug, used for deduplication.
- **Opportunities_Endpoint**: The existing read-only `GET /api/opportunities/latest` route serving the most recent Daily_Opportunity_Report.
- **Opportunity_Ingest_Endpoint**: The existing `POST /api/opportunities/ingest` route that persists a posted report under `data/opportunities/`, authorized by a bearer token.
- **Ingest_Token**: The bearer token `OPPORTUNITY_INGEST_TOKEN` that authorizes writes to the Opportunity_Ingest_Endpoint.
- **Idempotent_Upsert**: A write keyed by a Stable_Identifier that updates an existing record when the identifier already exists and creates a new record otherwise.
- **Persisted_Flag**: The `persisted` field returned by an ingest endpoint, set to false when the runtime filesystem is read-only (Vercel) so callers degrade gracefully rather than fail.
- **Operating_Day**: A calendar day on which the company runs its automated and review cadences, in UTC.
- **n8n_Workflow**: An n8n workflow that orchestrates a Discovery_Agent by calling repo endpoints on a schedule or webhook, applying retry (retryOnFail with three tries and approximately three-second backoff), per ADR-009.
- **Discovery_Run**: A single execution of a Discovery_Agent triggered on a schedule or by a webhook.

## Requirements

### Requirement 1: Discovery Department Mandate and Agent Roster

**User Story:** As the Director of Intelligence, I want the five discovery agents defined as employees of the existing Discovery_Opportunity_Intelligence Department, so that they execute the discovery mission without redefining the CEO or the PMO.

#### Acceptance Criteria

1. THE Intelligence_Discovery_Agents specification SHALL define exactly five Discovery_Agents: the Trend_Hunter_Agent, the Product_Hunter_Agent, the Competitor_Intelligence_Agent, the Niche_Discovery_Agent, and the Opportunity_Scoring_Agent.
2. THE Intelligence_Discovery_Agents specification SHALL define every Discovery_Agent as an AI_Agent_Employee of the Discovery_Opportunity_Intelligence Department as defined in the CEO Operating System Department_Register.
3. THE Intelligence_Discovery_Agents specification SHALL treat the Ghost CEO responsibilities and the PMO responsibilities as authoritative and unchanged.
4. THE Intelligence_Discovery_Agents specification SHALL reuse the Severity_Tiers, the Primary_KPI and Secondary_KPI definitions, the Category_Slug taxonomy, the Product schema, and the Data_Store conventions defined in the CEO Operating System and PROJECT_BIBLE.
5. THE Intelligence_Discovery_Agents specification SHALL define the Department mission as discovering profitable Opportunities before competitors, measured against the Primary_KPI and Secondary_KPI.
6. THE Intelligence_Discovery_Agents specification SHALL constrain every discovered Opportunity to the Summer_Scope and to exactly one Category_Slug.
7. THE Intelligence_Discovery_Agents specification SHALL designate the Discovery_Opportunity_Intelligence Department data source as the Opportunities_Endpoint, consistent with the CEO Operating System Department_Register.
8. WHEN a Discovery_Agent receives a Task routed by the PMO, THE Intelligence_Discovery_Agents specification SHALL execute the Task only when its Routing_Domain is trend or product discovery for the Discovery_Opportunity_Intelligence Department.

### Requirement 2: Trend Hunter Agent

**User Story:** As the Director of Intelligence, I want an agent that discovers trending summer topics, keywords, and themes, so that the company acts on Pinterest-relevant demand before competitors.

#### Acceptance Criteria

**Objective**

1. THE Trend_Hunter_Agent SHALL discover trending summer topics, keywords, and themes that map to the Summer_Scope and favor Pinterest distribution and GEO citability.

**Inputs**

2. THE Trend_Hunter_Agent SHALL take as input Trend_Signals scraped from Pinterest Trends and broader trend sources via Firecrawl `/v2/scrape`.
3. THE Trend_Hunter_Agent SHALL read its Seen_Index Memory_State_File at the start of each Discovery_Run to identify previously surfaced trends.
4. WHERE a PMO Task supplies a seed keyword or Category_Slug, THE Trend_Hunter_Agent SHALL scope the Discovery_Run to that seed.

**Outputs**

5. THE Trend_Hunter_Agent SHALL emit each discovered trend as an Opportunity_Record with Opportunity_Type trend, a Stable_Identifier, a normalized keyword, a mapped Category_Slug, a source, a captured timestamp, and a Momentum indicator.
6. IF a scraped Trend_Signal cannot be mapped to a Category_Slug within the Summer_Scope, THEN THE Trend_Hunter_Agent SHALL exclude the Trend_Signal from its Outputs.

**Workflow**

7. THE Trend_Hunter_Agent SHALL execute the ordered steps: load configuration, read the Seen_Index, scrape trend sources via Firecrawl, normalize and deduplicate Trend_Signals, map each signal to a Category_Slug, compute Momentum against Scoring_History, emit trend Opportunity_Records, and update the Seen_Index.
8. WHEN the Firecrawl scrape returns no usable data, THE Trend_Hunter_Agent SHALL complete the Discovery_Run using its Memory_Store state and SHALL record the trend source as data-unavailable for that Operating_Day.

**KPIs**

9. THE Trend_Hunter_Agent SHALL report, for each Discovery_Run, the count of new trends discovered, the count of trends mapped to each Category_Slug, and the count of trends that advanced to scored Opportunities.
10. THE Trend_Hunter_Agent SHALL prioritize trends by their expected contribution to the Secondary_KPI and the Primary_KPI and SHALL exclude raw pageviews from its prioritization inputs.

**Memory**

11. THE Trend_Hunter_Agent SHALL write the Stable_Identifier and last-seen date of every emitted trend to the Seen_Index at the end of each Discovery_Run.
12. WHEN a trend already present in the Seen_Index is rediscovered, THE Trend_Hunter_Agent SHALL update the existing Seen_Index entry rather than create a duplicate entry.

**n8n integration**

13. THE Trend_Hunter_Agent SHALL be invokable by an n8n_Workflow on a daily schedule and by a webhook, and SHALL persist its Outputs through a repo endpoint using bearer or shared-secret authentication.

### Requirement 3: Product Hunter Agent

**User Story:** As the Director of Intelligence, I want an agent that discovers specific trending Amazon products suitable for the summer catalog, so that the company can publish high-converting affiliate pages and pins before competitors.

#### Acceptance Criteria

**Objective**

1. THE Product_Hunter_Agent SHALL discover specific trending Amazon products that fit the Summer_Scope and are suitable for the affiliate catalog.

**Inputs**

2. THE Product_Hunter_Agent SHALL take as input product signals scraped from Amazon Movers & Shakers and Amazon best-seller sources via Firecrawl `/v2/scrape`.
3. THE Product_Hunter_Agent SHALL read the existing catalog from the products data source and SHALL read its seen-products Memory_State_File at the start of each Discovery_Run.
4. WHERE a PMO Task supplies a target Category_Slug, THE Product_Hunter_Agent SHALL scope the Discovery_Run to that Category_Slug.

**Outputs**

5. THE Product_Hunter_Agent SHALL emit each discovered product as an Opportunity_Record with Opportunity_Type product, a Stable_Identifier, a title, a candidate brand, a price, a rating where available, a mapped Category_Slug, candidate Product_Tags drawn only from the allowed set trending, tiktok, under-25, and viral, an asin where available, and an affiliateUrl candidate.
6. THE Product_Hunter_Agent SHALL emit only product Opportunity_Records whose mapped Category_Slug is one of the seven Category_Slugs.
7. WHERE a discovered product maps to the tiktok-finds Category_Slug, THE Product_Hunter_Agent SHALL flag the product Opportunity_Record as filling a known Coverage_Gap.
8. IF a discovered product already exists in the catalog by asin or by Stable_Identifier, THEN THE Product_Hunter_Agent SHALL mark the product Opportunity_Record as already-covered rather than as a new Opportunity.

**Workflow**

9. THE Product_Hunter_Agent SHALL execute the ordered steps: load configuration, read the catalog and the seen-products Memory_State_File, scrape product sources via Firecrawl, normalize products, map each product to a Category_Slug, deduplicate against the catalog and the seen-products state, derive candidate Product_Tags, emit product Opportunity_Records, and update the seen-products state.
10. WHEN the Firecrawl scrape returns no usable data, THE Product_Hunter_Agent SHALL complete the Discovery_Run using its Memory_Store state and SHALL record the product source as data-unavailable for that Operating_Day.

**KPIs**

11. THE Product_Hunter_Agent SHALL report, for each Discovery_Run, the count of new products discovered, the count per Category_Slug, and the count of products discovered for the tiktok-finds Coverage_Gap.
12. THE Product_Hunter_Agent SHALL prioritize products by their expected contribution to the Primary_KPI and SHALL exclude raw pageviews from its prioritization inputs.

**Memory**

13. THE Product_Hunter_Agent SHALL write the Stable_Identifier, the asin where available, and the last-seen date of every emitted product to its seen-products Memory_State_File at the end of each Discovery_Run.
14. WHEN a product already present in the seen-products state is rediscovered, THE Product_Hunter_Agent SHALL update the existing entry rather than create a duplicate entry.

**n8n integration**

15. THE Product_Hunter_Agent SHALL be invokable by an n8n_Workflow on a daily schedule and by a webhook, and SHALL persist its Outputs through a repo endpoint using bearer or shared-secret authentication.

### Requirement 4: Competitor Intelligence Agent

**User Story:** As the Director of Intelligence, I want an agent that monitors competitor affiliate sites, pins, and rankings, so that the company can exploit coverage gaps and replicate winning angles before competitors consolidate them.

#### Acceptance Criteria

**Objective**

1. THE Competitor_Intelligence_Agent SHALL monitor Competitor_Properties to discover Coverage_Gaps and Winning_Angles within the Summer_Scope.

**Inputs**

2. THE Competitor_Intelligence_Agent SHALL take as input a configured list of Competitor_Properties and the content scraped from them via Firecrawl `/v2/scrape`.
3. THE Competitor_Intelligence_Agent SHALL read the existing catalog and its competitor-snapshots Memory_State_File at the start of each Discovery_Run.

**Outputs**

4. THE Competitor_Intelligence_Agent SHALL emit each discovered gap as an Opportunity_Record with Opportunity_Type competitor-gap, a Stable_Identifier, the source Competitor_Property, a mapped Category_Slug, a description of the gap or Winning_Angle, and a Momentum indicator.
5. WHEN a Competitor_Property covers a topic or product within the Summer_Scope that the catalog does not cover, THE Competitor_Intelligence_Agent SHALL emit a competitor-gap Opportunity_Record describing the missing coverage.
6. WHEN a Competitor_Property exhibits a recurring content or format pattern correlated with ranking or distribution success, THE Competitor_Intelligence_Agent SHALL record that pattern as a Winning_Angle on the Opportunity_Record.
7. IF a scraped competitor topic falls outside the Summer_Scope, THEN THE Competitor_Intelligence_Agent SHALL exclude the topic from its Outputs.

**Workflow**

8. THE Competitor_Intelligence_Agent SHALL execute the ordered steps: load the Competitor_Property list, read the competitor-snapshots Memory_State_File, scrape each Competitor_Property via Firecrawl, diff the new snapshot against the prior snapshot, identify Coverage_Gaps and Winning_Angles, map findings to Category_Slugs, emit competitor-gap Opportunity_Records, and write the new snapshot to the Memory_Store.
9. WHEN a Competitor_Property is unreachable during a Discovery_Run, THE Competitor_Intelligence_Agent SHALL continue with the remaining Competitor_Properties and SHALL record the unreachable property as data-unavailable for that Operating_Day.

**KPIs**

10. THE Competitor_Intelligence_Agent SHALL report, for each Discovery_Run, the count of Competitor_Properties monitored, the count of Coverage_Gaps discovered, and the count of Winning_Angles recorded.
11. THE Competitor_Intelligence_Agent SHALL prioritize Coverage_Gaps by their expected contribution to the Primary_KPI and Secondary_KPI and SHALL exclude raw pageviews from its prioritization inputs.

**Memory**

12. THE Competitor_Intelligence_Agent SHALL write a dated snapshot of each Competitor_Property to its competitor-snapshots Memory_State_File at the end of each Discovery_Run to enable day-over-day diffing.
13. WHEN a Competitor_Property snapshot already exists for a property, THE Competitor_Intelligence_Agent SHALL retain the prior snapshot for delta computation and SHALL update the current snapshot in place keyed by the property identifier.

**n8n integration**

14. THE Competitor_Intelligence_Agent SHALL be invokable by an n8n_Workflow on a schedule and by a webhook, SHALL apply retry on each scrape with three tries and approximately three-second backoff, and SHALL persist its Outputs through a repo endpoint using bearer or shared-secret authentication.

### Requirement 5: Niche Discovery Agent

**User Story:** As the Director of Intelligence, I want an agent that finds underserved sub-niches and long-tail clusters within the fixed summer categories, so that the company captures low-competition affiliate and GEO opportunities competitors overlook.

#### Acceptance Criteria

**Objective**

1. THE Niche_Discovery_Agent SHALL discover underserved sub-niches and Long_Tail_Clusters within the seven Category_Slugs of the Summer_Scope.

**Inputs**

2. THE Niche_Discovery_Agent SHALL take as input the trend Opportunity_Records from the Trend_Hunter_Agent, the existing catalog, and long-tail keyword signals scraped via Firecrawl `/v2/scrape`.
3. THE Niche_Discovery_Agent SHALL read its niche-coverage Memory_State_File at the start of each Discovery_Run.

**Outputs**

4. THE Niche_Discovery_Agent SHALL emit each discovered sub-niche as an Opportunity_Record with Opportunity_Type niche, a Stable_Identifier, a mapped Category_Slug, a Long_Tail_Cluster of related keywords, an estimated competition indicator, and a GEO_Citability_Score input.
5. THE Niche_Discovery_Agent SHALL emit niche Opportunity_Records only for the seven Category_Slugs and SHALL group each cluster under exactly one Category_Slug.
6. WHEN a Category_Slug has catalog coverage below a configured threshold, THE Niche_Discovery_Agent SHALL prioritize discovery of sub-niches within that Category_Slug.
7. WHERE the tiktok-finds Category_Slug has zero catalog coverage, THE Niche_Discovery_Agent SHALL emit at least one tiktok-finds sub-niche Opportunity_Record when a qualifying Long_Tail_Cluster is found.

**Workflow**

8. THE Niche_Discovery_Agent SHALL execute the ordered steps: load configuration, read the niche-coverage Memory_State_File, ingest trend Opportunity_Records and catalog coverage, scrape long-tail signals via Firecrawl, cluster keywords into Long_Tail_Clusters per Category_Slug, estimate competition and GEO citability, emit niche Opportunity_Records, and update the niche-coverage state.

**KPIs**

9. THE Niche_Discovery_Agent SHALL report, for each Discovery_Run, the count of sub-niches discovered per Category_Slug and the count of Long_Tail_Clusters that map to an underserved Category_Slug.
10. THE Niche_Discovery_Agent SHALL prioritize sub-niches by their combined expected contribution to the Primary_KPI and GEO citability and SHALL exclude raw pageviews from its prioritization inputs.

**Memory**

11. THE Niche_Discovery_Agent SHALL write the discovered Long_Tail_Clusters and per-Category_Slug coverage levels to its niche-coverage Memory_State_File at the end of each Discovery_Run.
12. WHEN a Long_Tail_Cluster already present in the niche-coverage state is rediscovered, THE Niche_Discovery_Agent SHALL update the existing cluster entry rather than create a duplicate entry.

**n8n integration**

13. THE Niche_Discovery_Agent SHALL be invokable by an n8n_Workflow on a schedule and by a webhook, and SHALL persist its Outputs through a repo endpoint using bearer or shared-secret authentication.

### Requirement 6: Opportunity Scoring Agent

**User Story:** As the Director of Intelligence, I want an agent that scores and ranks all discovered opportunities 0–100 and produces the daily opportunity report, so that the rest of the company consumes one consistent, ranked source of opportunities optimized for outbound clicks.

#### Acceptance Criteria

**Objective**

1. THE Opportunity_Scoring_Agent SHALL assign each Opportunity an integer Opportunity_Score from 0 to 100 and SHALL rank Opportunities in descending order of Opportunity_Score, consistent with the existing WF-06 0–100 scoring.

**Inputs**

2. THE Opportunity_Scoring_Agent SHALL take as input the Opportunity_Records emitted by the Trend_Hunter_Agent, the Product_Hunter_Agent, the Competitor_Intelligence_Agent, and the Niche_Discovery_Agent.
3. THE Opportunity_Scoring_Agent SHALL read the prior Daily_Opportunity_Report from the Opportunities_Endpoint and the Scoring_History Memory_State_File at the start of each Discovery_Run.

**Outputs**

4. THE Opportunity_Scoring_Agent SHALL compute for each Opportunity a Pinterest_Potential_Score, an Affiliate_Potential_Score, and a GEO_Citability_Score, each on a 0–100 scale, and SHALL derive the Opportunity_Score from those sub-scores.
5. THE Opportunity_Scoring_Agent SHALL produce a Daily_Opportunity_Report containing the report date, the ranked Opportunities, the top Pinterest opportunities, the top affiliate opportunities, a missing-coverage summary, and a compact scored list for next-day delta lookups, consistent with the existing WF-06 report shape.
6. THE Opportunity_Scoring_Agent SHALL POST the Daily_Opportunity_Report to the Opportunity_Ingest_Endpoint so that the report is served at the Opportunities_Endpoint.

**Workflow**

7. THE Opportunity_Scoring_Agent SHALL execute the ordered steps: load scoring configuration and weights, read prior report and Scoring_History, ingest Opportunity_Records from the four discovery agents, compute the three sub-scores and the Opportunity_Score deterministically, compute Momentum against Scoring_History, rank Opportunities, request a bounded Claude brief for human-readable reasoning, assemble the Daily_Opportunity_Report, POST it to the Opportunity_Ingest_Endpoint, and update the Scoring_History.
8. IF the Claude brief request fails, THEN THE Opportunity_Scoring_Agent SHALL produce the Daily_Opportunity_Report using the deterministic scores and SHALL record the brief as unavailable.

**KPIs**

9. THE Opportunity_Scoring_Agent SHALL report, for each Discovery_Run, the count of Opportunities scored, the count of Opportunities with an Opportunity_Score at or above a configured high-opportunity threshold, and the day-over-day Momentum of the top Opportunities.
10. THE Opportunity_Scoring_Agent SHALL weight the Affiliate_Potential_Score toward the Primary_KPI such that, when one normalized unit is added to the Affiliate_Potential_Score and separately one normalized unit is added to the Pinterest_Potential_Score of the same Opportunity, the increase in Opportunity_Score is at least as large for the Affiliate_Potential_Score addition.
11. THE Opportunity_Scoring_Agent SHALL exclude raw pageviews from the inputs used to compute the Opportunity_Score.

**Memory**

12. THE Opportunity_Scoring_Agent SHALL write the Opportunity_Score, the three sub-scores, and the date for every scored Opportunity to the Scoring_History Memory_State_File at the end of each Discovery_Run.
13. WHEN a prior score for an Opportunity exists in the Scoring_History, THE Opportunity_Scoring_Agent SHALL compute Momentum as the difference between the current Opportunity_Score and the prior Opportunity_Score.

**n8n integration**

14. THE Opportunity_Scoring_Agent SHALL be invokable by an n8n_Workflow on a daily schedule at 06:00 UTC and by a manual or webhook trigger, consistent with the existing WF-06 cadence.
15. WHEN the Opportunity_Scoring_Agent POSTs the Daily_Opportunity_Report, THE Opportunity_Scoring_Agent SHALL authorize the request with the Ingest_Token as a bearer token.

### Requirement 7: Shared Opportunity Data Model

**User Story:** As the Director of Intelligence, I want every agent to emit opportunities in one shared schema, so that the scoring agent, the Opportunities_Endpoint, and the rest of the company consume a single consistent record.

#### Acceptance Criteria

1. THE Intelligence_Discovery_Agents specification SHALL define an Opportunity_Record schema containing a Stable_Identifier, an Opportunity_Type, a Category_Slug, a source, a discovered timestamp, a primary keyword or target entity, a Momentum indicator, and a scoring section.
2. THE Intelligence_Discovery_Agents specification SHALL constrain Opportunity_Type to one of trend, product, competitor-gap, or niche.
3. THE Intelligence_Discovery_Agents specification SHALL constrain Category_Slug to one of the seven fixed Category_Slugs.
4. WHERE an Opportunity_Record represents a product, THE Intelligence_Discovery_Agents specification SHALL require its fields to be compatible with the canonical Product schema fields id, title, brand, price, rating, category, tags, asin, and affiliateUrl.
5. THE Intelligence_Discovery_Agents specification SHALL constrain product Product_Tags to the allowed set trending, tiktok, under-25, and viral.
6. THE Intelligence_Discovery_Agents specification SHALL store every Opportunity_Record as git-tracked JSON under the Data_Store, in the `data/opportunities/` location used by the existing report.
7. WHEN an Opportunity_Record is serialized to JSON and then read back from the Data_Store, THE Intelligence_Discovery_Agents specification SHALL produce an Opportunity_Record equivalent to the original.

### Requirement 8: Scoring Consistency with WF-06 and the Opportunities Endpoint

**User Story:** As the Director of Intelligence, I want scoring to be deterministic and consistent with the existing WF-06 0–100 model, so that scores are explainable, reproducible, and compatible with what the company already consumes.

#### Acceptance Criteria

1. THE Opportunity_Scoring_Agent SHALL produce Opportunity_Scores on the same 0–100 integer scale used by the existing WF-06 Pinterest and affiliate scoring.
2. FOR ALL Opportunities with identical scoring inputs, THE Opportunity_Scoring_Agent SHALL produce the same Opportunity_Score.
3. THE Opportunity_Scoring_Agent SHALL record, for each scored Opportunity, the per-axis sub-scores that produced the Opportunity_Score so that the score is explainable.
4. WHEN the Affiliate_Potential_Score of an Opportunity increases while its other inputs are unchanged, THE Opportunity_Scoring_Agent SHALL produce an Opportunity_Score that is greater than or equal to the previous Opportunity_Score.
5. WHEN two Opportunities have an equal Opportunity_Score, THE Opportunity_Scoring_Agent SHALL order the Opportunity with the higher Affiliate_Potential_Score first, and SHALL order by the Stable_Identifier when the Affiliate_Potential_Score is also equal.
6. THE Opportunity_Scoring_Agent SHALL serve the ranked Opportunities through the existing Daily_Opportunity_Report consumed at the Opportunities_Endpoint without changing the endpoint contract.

### Requirement 9: Memory, Deduplication, and Delta Tracking

**User Story:** As the Director of Intelligence, I want agents to remember what they have already surfaced and to track changes over time, so that the same opportunity is not re-surfaced and the company sees momentum.

#### Acceptance Criteria

1. THE Intelligence_Discovery_Agents specification SHALL store all persistent agent state as Memory_State_Files in the git-tracked Memory_Store under `data/opportunities/`.
2. THE Intelligence_Discovery_Agents specification SHALL require each Discovery_Agent to read its Memory_State_Files at the start of a Discovery_Run and write them at the end of a Discovery_Run.
3. THE Intelligence_Discovery_Agents specification SHALL compute a deterministic Opportunity_Fingerprint from the normalized Opportunity_Type, primary keyword or target entity, and Category_Slug of an Opportunity.
4. FOR ALL Opportunities with identical normalized Opportunity_Type, primary keyword or target entity, and Category_Slug, THE Intelligence_Discovery_Agents specification SHALL compute the same Opportunity_Fingerprint.
5. WHEN an Opportunity is discovered whose Opportunity_Fingerprint matches an entry in the Seen_Index, THE Intelligence_Discovery_Agents specification SHALL update the existing Opportunity_Record rather than emit a duplicate Opportunity_Record.
6. WHEN the same Opportunity is rediscovered across consecutive Discovery_Runs, THE Intelligence_Discovery_Agents specification SHALL update the last-seen date and the Momentum of the existing Opportunity_Record and SHALL hold the count of records for that Opportunity_Fingerprint at one.
7. THE Intelligence_Discovery_Agents specification SHALL compute Momentum for an Opportunity from its current score and the score recorded for the same Stable_Identifier in the Scoring_History.

### Requirement 10: n8n Integration and Idempotency

**User Story:** As the operator, I want every discovery agent to be orchestrated and safe to repeat from n8n, so that the automation layer conducts discovery without owning data or creating duplicates.

#### Acceptance Criteria

1. THE Intelligence_Discovery_Agents specification SHALL keep all discovery and scoring business logic in the repo and SHALL limit n8n to orchestration, consistent with ADR-009.
2. THE Intelligence_Discovery_Agents specification SHALL expose every agent Output through a repo `/api/` endpoint that validates a bearer token or a shared-secret header before performing any write.
3. IF an agent endpoint receives a request without a valid bearer token or shared-secret header, THEN THE agent endpoint SHALL return an unauthorized response and perform no write.
4. IF an agent endpoint receives invalid or empty JSON, THEN THE agent endpoint SHALL return a bad-request response and perform no write.
5. THE Intelligence_Discovery_Agents specification SHALL perform Idempotent_Upserts keyed by the Stable_Identifier so that repeated writes for the same Opportunity_Record update the existing record rather than create a duplicate.
6. THE Intelligence_Discovery_Agents specification SHALL require each scraping HTTP request orchestrated by n8n to use retry with three tries and approximately three-second backoff and to continue on failure rather than abort the Discovery_Run.
7. THE Intelligence_Discovery_Agents specification SHALL make every Discovery_Agent invocable by an n8n_Workflow both on a schedule and by a webhook.
8. WHERE an agent endpoint cannot persist a record to the local filesystem, THE agent endpoint SHALL return a response with the Persisted_Flag set to false rather than fail the request, consistent with the existing `/api/opportunities/ingest` behavior.
9. THE Intelligence_Discovery_Agents specification SHALL use Firecrawl `/v2/scrape` as the discovery scraper and Claude as the analysis model, consistent with ADR-008 and ADR-006.

### Requirement 11: KPI Alignment and Focus Areas

**User Story:** As the Director of Intelligence, I want discovery to optimize for outbound Amazon clicks through Pinterest, GEO citability, and affiliate fit, so that effort flows to opportunities that produce revenue rather than vanity metrics.

#### Acceptance Criteria

1. THE Intelligence_Discovery_Agents specification SHALL optimize discovery toward the Primary_KPI of monthly outbound clicks to Amazon.
2. THE Intelligence_Discovery_Agents specification SHALL treat the Secondary_KPI of pins published per week and Pinterest outbound clicks as leading indicators that feed the Primary_KPI.
3. THE Intelligence_Discovery_Agents specification SHALL exclude raw pageviews from every prioritization and scoring input used by the Discovery_Agents.
4. THE Intelligence_Discovery_Agents specification SHALL incorporate Pinterest distribution potential, SEO/GEO citability, and Amazon affiliate fit as scoring focus areas for every Opportunity.
5. WHEN two Opportunities differ only in expected outbound-click contribution, THE Opportunity_Scoring_Agent SHALL rank the Opportunity with the higher expected outbound-click contribution first.
6. THE Intelligence_Discovery_Agents specification SHALL report each agent's KPIs in a form that rolls up into the Discovery_Opportunity_Intelligence Department's Daily_Report consumed by the CEO Operating System and the PMO.
