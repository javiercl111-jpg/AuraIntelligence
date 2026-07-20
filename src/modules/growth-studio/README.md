# Aura Growth Studio™

> AI Growth Operating System — Launch Edition

## Purpose

Aura Growth Studio is a strategic growth module within the Aura Intelligence platform. It enables executives to define growth objectives through AI-assisted conversations, generate marketing campaigns, manage approval workflows, and publish content across channels — all guided by the organization's Brand Brain.

## Current Status

**Sprint**: Growth-00.5 — Foundation Integration
**Status**: `foundation`
**Feature Flag**: `growth_studio.enabled` = `false` (OFF by default)

This sprint establishes the technical foundation only. No functional features are active.

## Sprint Limits

This sprint explicitly does **NOT** implement:

- Executive growth conversation flow
- Campaign generation or management
- Brand Brain functional data
- AI integration or content generation
- Publication to external channels
- Firestore persistence (read or write)
- React Router navigation
- React Context providers
- RBAC enforcement
- Firebase Emulator tests
- Multi-tenant migration
- Deployment

## Architecture

### Location

Growth Studio lives **within** the Aura Intelligence repository:

```
aura-intelligence/src/modules/growth-studio/
```

It is NOT a separate application or repository.

### Current Architecture vs. Target

| Aspect | Current (Growth-00.5) | Target (Future) |
|---|---|---|
| Routing | None | React Router integration |
| State | Props only | React Context + hooks |
| Auth | Uses parent App auth | Dedicated auth context |
| Data | No persistence | Firestore collections |
| AI | No AI | AI Gateway integration |
| RBAC | Not enforced | Capability-based RBAC |

The modernization will be **progressive**. No validated modules should be modified without regression tests.

### Module Structure

```
src/modules/growth-studio/
├── __tests__/             # Smoke and unit tests
├── components/            # React components
│   └── GrowthStudioEntry  # Minimal visual entry point
├── config/                # Module configuration
│   ├── capabilities       # RBAC capability registry
│   ├── collections        # Firestore collection constants
│   └── module             # Module definition
├── hooks/                 # React hooks (future)
├── services/
│   └── contracts/         # Service interfaces (no impl)
├── types/                 # TypeScript models
├── utils/                 # Utility functions (future)
└── index.ts               # Public API
```

## Models

| Model | Description | States |
|---|---|---|
| `GrowthObjective` | Strategic growth goal | draft, active, completed, archived |
| `GrowthConversation` | Executive AI conversation | active, completed, abandoned |
| `GrowthConversationTurn` | Single conversation message | — |
| `GrowthCampaign` | Marketing campaign | draft → pending_approval → approved → scheduled → published → archived |
| `BrandBrainProfile` | Brand identity & guidelines | — |
| `GrowthApproval` | Approval gate record | pending, approved, rejected, changes_requested |
| `GrowthWorkspace` | Tenant workspace config | active, inactive, provisioning, suspended |
| `GrowthAnalyticsSummary` | Analytics contract (future) | — |

## Service Contracts

| Contract | Lifecycle Operations |
|---|---|
| `IGrowthConversationService` | start → addTurn → advanceStage → complete/abandon |
| `IBrandBrainService` | create → get → update |
| `ICampaignService` | createDraft → requestApproval → markApproved → publish |
| `IGrowthApprovalService` | requestApproval → decide → validateApproval |
| `IPublisherService` | publish (requires valid approvalId) |
| `IGrowthAIProvider` | generateConversationResponse, generateCampaignContent |

**Invariant**: No campaign can be published without a valid `approvalId` referencing an approved `GrowthApproval` record.

## Feature Flag

The module is controlled by:

```
growth_studio.enabled = false (default)
```

Override in development only:
```env
VITE_FEATURE_GROWTH_STUDIO=true
```

- No localStorage
- No Firestore
- No Remote Config
- Falls back to `false` if env var is missing

## Firestore Collections (Constants Only)

| Constant | Collection Name |
|---|---|
| `CONVERSATIONS` | `growth_conversations` |
| `OBJECTIVES` | `growth_objectives` |
| `CAMPAIGNS` | `growth_campaigns` |
| `BRAND_BRAIN_PROFILES` | `brand_brain_profiles` |
| `APPROVALS` | `growth_approvals` |
| `AUDIT_LOG` | `growth_audit_log` |

**No Firestore services, document writes, or rules modifications exist in this sprint.**

## Future Dependencies

- Firebase Auth (current app auth)
- Firestore (persistence)
- AI Gateway (content generation)
- Firebase Storage (media assets)

## Not Implemented (Explicit)

- [ ] Conversation UI
- [ ] Objective creation flow
- [ ] Campaign generation
- [ ] Brand Brain data entry
- [ ] Approval UI
- [ ] Content publishing
- [ ] Analytics dashboard
- [ ] RBAC enforcement
- [ ] Multi-tenant workspace provisioning
- [ ] Firebase Emulator test suite

## Roadmap

| Sprint | Focus |
|---|---|
| **Growth-01** | Executive Growth Conversation |
| **Growth-02** | Growth Objective CRUD |
| **Growth-03** | Brand Brain (Minimal) |
| **Growth-04** | Campaign Draft Generation |
| **Growth-05** | Approval Flow |
