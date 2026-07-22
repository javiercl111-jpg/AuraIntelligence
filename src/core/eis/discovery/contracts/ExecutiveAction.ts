import type { ExecutivePriority } from '../../enums';
import type { ExecutiveActionStatus } from '../enums';

export interface ExecutiveAction {
  readonly actionId: string;
  readonly title: string;
  readonly description: string;
  readonly priority: ExecutivePriority;
  readonly ownerRole?: string;
  readonly timeframe: string;
  readonly dependencies: readonly string[];
  readonly successCriteria: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly status: ExecutiveActionStatus;
}
