# GROWTH-UI-01 — Aura Growth Product Experience Contract V1

## 1. Product purpose

Aura Growth shall evolve from the existing Growth Studio conversational
experience into a complete, simple-to-use enterprise growth platform.

The product shall preserve existing certified Growth capabilities and expose
them through progressive disclosure rather than overwhelming the user.

Primary UX question:

1. How is my company growing?
2. What opportunity should I focus on?
3. What does Aura recommend?
4. What should I do next?

---

## 2. Product information architecture

Aura Growth shall provide the following primary product surfaces:

1. Overview
2. Opportunities
3. Campaigns
4. Intelligence
5. Content & Execution
6. Performance
7. Growth Advisor
8. Team & Users
9. Notification Center
10. Settings

Growth Advisor shall preserve and reuse the existing executive conversational
experience. It shall be one product capability, not the entire product shell.

---

## 3. Progressive disclosure

Aura Growth shall organize complexity into three experience levels.

### Level 1 — Executive

Expose:

- Growth status
- Growth Score
- priority opportunities
- campaign health
- key KPIs
- Intelligence alerts
- recommended next actions

### Level 2 — Management

Expose:

- opportunity pipeline
- campaigns
- content and execution
- performance
- team responsibilities
- approvals
- notifications

### Level 3 — Intelligence and Governance

Expose when required:

- evidence
- confidence
- assumptions
- risks
- explainability
- traceability
- governance
- audit information

Advanced detail must not overwhelm the default executive experience.

---

## 4. Aura brand governance

Aura Growth is part of the Aura product family.

The Product Shell shall:

- display the official Aura logo;
- preserve official logo proportions and clear space;
- reuse the canonical Aura visual identity;
- preserve the existing premium enterprise dark language where compatible;
- prefer shared design tokens over component-specific brand decisions;
- reuse established Aura typography and hierarchy;
- remain visually consistent with the wider Aura ecosystem.

Growth-specific accents may complement Aura identity but shall never replace
or redefine the Aura brand.

The current Growth Studio emerald treatment is not by itself authoritative
evidence of the canonical Aura brand palette.

Arbitrary product-specific palettes shall not be introduced.

Hard-coded brand colors should progressively move behind shared semantic
design tokens when product surfaces are implemented.

---

## 5. Overview

Overview shall provide a decision-oriented executive landing surface.

Minimum concepts:

- Growth Score
- executive KPIs
- priority opportunities
- active campaigns
- campaign health
- Intelligence alerts
- next best actions
- recent relevant activity

Overview shall prioritize action and clarity over information density.

---

## 6. Opportunities

Opportunities shall support:

- opportunity pipeline
- priority
- estimated potential
- evidence
- Intelligence assessment
- confidence
- recommended action
- responsible user
- status

---

## 7. Campaigns

Campaigns shall support:

- campaign portfolio
- objective
- audience
- value proposition
- channels
- key messages
- expected KPIs
- strategy
- approval state
- execution state
- performance state

Existing Campaign Strategy capabilities should be reused where compatible.

---

## 8. Intelligence

Intelligence shall expose governed decision support including:

- recommendations
- confidence
- evidence
- assumptions
- risks
- explainability
- next best actions

Intelligence output shall not create browser-side authority.

---

## 9. Content & Execution

This area shall reuse existing Growth Studio capabilities where compatible,
including:

- Brand Brain
- Content Plan
- Content Brief
- generated assets
- Asset Pipeline
- Execution Plan
- readiness
- risks
- review
- approval

---

## 10. Performance

Performance shall provide:

- campaign KPIs
- goal progress
- conversion indicators
- trend information
- performance against target
- Intelligence interpretation
- recommended corrective actions

---

## 11. Growth Advisor

The existing Executive Conversation capability shall be preserved as
Growth Advisor.

Growth Advisor shall help users:

- define objectives
- reason about strategy
- build campaigns
- prepare content
- review evidence
- interpret performance
- obtain recommendations

Conversational UX shall complement structured product workflows.

---

## 12. Team & Users

Aura Growth requires commercial multi-user operation.

Required product concepts:

- members
- invitations
- activation/deactivation
- roles
- responsibilities
- campaign/opportunity ownership
- notification preferences
- relevant activity

Initial functional roles:

- OWNER / ADMIN
- GROWTH_MANAGER
- CONTRIBUTOR
- VIEWER

These are Growth product roles only.

They shall map to canonical Aura identity and tenant authority.

React components shall never become the authority source for identity,
tenant membership or permissions.

---

## 13. Notification Center

Aura Growth shall include an in-product Notification Center.

Initial notification families:

- OPPORTUNITY_HIGH_PRIORITY
- CAMPAIGN_REQUIRES_APPROVAL
- INTELLIGENCE_RECOMMENDATION
- KPI_RISK
- EXECUTION_DEADLINE
- ASSET_READY_FOR_REVIEW
- ACTION_ASSIGNED

Notification channels may include:

- IN_APP
- PUSH
- EMAIL

Notification delivery shall respect severity and user preferences.

Aura Growth shall reuse the proven notification architecture/pattern already
available in the Aura ecosystem rather than create an unrelated parallel
notification engine.

Maintenance-specific work-order semantics shall not leak into Growth
contracts.

---

## 14. Push notifications

Push notifications are part of the target product experience.

Push shall be used for actionable, relevant events rather than routine
low-value changes.

Users shall retain notification preferences.

Push navigation should resolve to the relevant Growth resource or action.

---

## 15. PWA

PWA capability shall be reused when technically compatible with the host
platform.

Priority capabilities:

- installability
- responsive standalone experience
- service worker support
- push reception
- safe notification navigation

Complex offline campaign or Intelligence execution is not required for the
initial commercial baseline.

---

## 16. Settings

Settings shall be a first-class product surface.

Required areas:

### Company & Brand

- company profile
- Brand Brain
- brand identity
- value proposition

### Growth Objectives

- objectives
- markets
- audiences
- KPIs

### Channels & Integrations

Initial target channel families:

- LinkedIn
- Facebook
- Instagram
- Email
- Website / Landing Pages
- Google / Ads
- future certified connectors

Each integration shall expose a clear state:

- CONNECTED
- NOT_CONNECTED
- CONFIGURATION_PENDING
- NEEDS_ATTENTION
- NOT_AVAILABLE

Where applicable, display:

- connected account
- authorized permissions
- last synchronization
- enabled Growth capabilities
- reconnect / disconnect controls

### Intelligence Preferences

Expose only safe product preferences.

Client-side settings shall never override governed server authority.

### Notification Preferences

Allow appropriate control over:

- in-app
- push
- email
- event categories
- severity thresholds where supported

### Security & Permissions

Expose appropriate information for:

- sessions
- authorized integrations
- permissions
- audit / traceability

---

## 17. Channel authorization

Aura Growth shall not store social-network passwords.

External channel integrations shall use certified authorization mechanisms
such as OAuth/API authorization where supported.

Tokens and secrets shall be handled by trusted server-side infrastructure,
not React components.

The UI shall expose connection state and authorization actions only.

---

## 18. Channel capability model

Connection does not imply autonomous publication.

The conceptual lifecycle is:

CONNECTED
→ READ / ANALYZE
→ PREPARE
→ REVIEW
→ APPROVE
→ PUBLISH

Capabilities shall be explicitly controlled.

Example channel capabilities may include:

- read metrics
- analyze content
- prepare content
- publish after approval

Initial commercial behavior should prefer human approval before external
publication.

---

## 19. Governance

Aura Growth shall preserve governed execution principles established by the
Intelligence integration.

The visual product shall not:

- construct trusted tenant authority from payload data;
- grant itself permissions;
- expose productive execution switches that bypass governance;
- silently publish because a channel is connected;
- treat browser state as authoritative identity.

Human review and approval shall remain explicit where required.

---

## 20. Reuse policy

Existing Growth Studio capabilities shall be reused whenever compatible.

The implementation shall prefer composition over unnecessary rewrites.

Existing capabilities include substantial work around:

- Growth Objectives
- Brand Brain
- Campaign Strategy
- Content Planning
- Content Briefs
- Asset generation
- Execution Planning
- Recommendations
- Evidence
- Readiness
- Governance
- Executive Conversation

---

## 21. Commercial UX standard

Aura Growth shall be:

- easy to understand;
- complete without feeling complicated;
- decision-oriented;
- responsive;
- enterprise-grade;
- consistent with Aura identity;
- safe by default;
- explainable where Intelligence is involved.

The default experience shall favor:

Situation → Recommendation → Action

over exposing internal system complexity.

---

## 22. Implementation sequence

The initial implementation sequence is:

F2 — Product Shell + Executive Overview

F3 — Opportunities + Campaign Portfolio

F4 — Intelligence + Growth Advisor integration

F5 — Content & Execution

F6 — Performance

F7 — Team & Users

F8 — Notification Center + Push integration

F9 — Settings + Channels & Integrations

F10 — Responsive / PWA readiness

F11 — End-to-End Product Regression

F12 — Commercial Stable Baseline

---

## 23. Contract status

Contract version: 1.0

Status:

FROZEN FOR GROWTH-UI-01 IMPLEMENTATION

This contract defines product experience scope.

It does not itself authorize production deployment, autonomous publication,
external channel credentials, or productive Intelligence execution.
