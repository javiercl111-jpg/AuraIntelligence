// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Objective Mock Service
// ─────────────────────────────────────────────────────────────

import type { GrowthObjective } from '../types/growthObjective';
import type { GrowthStructuredContext } from '../types/growthConversation';
import { GrowthObjectiveBuilder } from './GrowthObjectiveBuilder';

const objectives = new Map<string, GrowthObjective>();

export class GrowthObjectiveMockService {
  /**
   * Retrieves an objective by its ID.
   */
  async getObjective(id: string): Promise<GrowthObjective | null> {
    const obj = objectives.get(id);
    return obj ? { ...obj } : null;
  }

  /**
   * Builds or rebuilds an objective from context and saves it in memory.
   */
  async buildAndSaveObjective(
    conversationId: string,
    context: GrowthStructuredContext,
    isConfirmed: boolean = false
  ): Promise<GrowthObjective> {
    // We use conversationId to consistently find the existing objective if it exists
    let existingObj: GrowthObjective | undefined;
    
    // Find if we already have an objective for this conversation
    for (const obj of objectives.values()) {
      if (obj.id.includes(conversationId)) {
        existingObj = obj;
        break;
      }
    }

    const built = GrowthObjectiveBuilder.buildFromContext(context, isConfirmed, existingObj);
    
    // If we didn't have one, we make sure its ID includes the conversationId for easy lookup in this mock
    let finalBuilt = built;
    if (!existingObj) {
      finalBuilt = { ...built, id: `go_${conversationId}` };
    }

    objectives.set(finalBuilt.id, finalBuilt);
    return { ...finalBuilt };
  }
}

export const growthObjectiveService = new GrowthObjectiveMockService();
