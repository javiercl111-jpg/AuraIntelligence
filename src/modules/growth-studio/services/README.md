# Services

Reserved directory for Growth Studio service implementations.

## Architecture

Service interfaces (contracts) are defined in `contracts/`.
Implementations will be created in future sprints and injected via dependency injection or factory pattern.

## Contracts (Defined)

| Contract | Purpose |
|---|---|
| `IGrowthConversationService` | Executive growth conversation lifecycle |
| `IBrandBrainService` | Brand knowledge management |
| `ICampaignService` | Campaign draft → approval → publish lifecycle |
| `IGrowthApprovalService` | Approval workflow gate |
| `IPublisherService` | External channel publication |
| `IGrowthAIProvider` | Decoupled AI capabilities provider |

## Status

**Sprint Growth-00.5**: Only contracts defined. No implementations.
