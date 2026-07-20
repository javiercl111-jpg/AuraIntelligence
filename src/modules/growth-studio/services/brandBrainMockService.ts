import type { BrandBrain } from '../types/brandBrain';
import { BrandBrainBuilder } from './BrandBrainBuilder';
import { BrandBrainValidator } from './BrandBrainValidator';
import type { GrowthStructuredContext } from '../types/growthConversation';
import type { IBrandBrainService } from './contracts/IBrandBrainService';

class BrandBrainMockService implements IBrandBrainService {
  private brains = new Map<string, BrandBrain>();

  async getProfile(id: string): Promise<BrandBrain | null> {
    return this.brains.get(id) || null;
  }

  async getBrandBrainByConversation(conversationId: string): Promise<BrandBrain | null> {
    return this.brains.get(`bb_${conversationId}`) || null;
  }

  async hasProfile(conversationId: string): Promise<boolean> {
    return this.brains.has(`bb_${conversationId}`);
  }

  /**
   * Generates or updates the BrandBrain for a given conversation.
   * @param conversationId The ID of the conversation.
   * @param context The extracted conversation context.
   * @param explicitConfirmations A map of fields that have been explicitly confirmed.
   */
  async buildBrandBrain(
    conversationId: string,
    context: GrowthStructuredContext,
    explicitConfirmations?: Record<string, boolean>
  ): Promise<BrandBrain> {
    const existingBrain = await this.getBrandBrainByConversation(conversationId);
    const built = BrandBrainBuilder.buildFromContext(context, existingBrain || undefined, explicitConfirmations);

    // Ensure its ID includes the conversationId for easy lookup
    const finalBuilt: BrandBrain = existingBrain ? built : { ...built, id: `bb_${conversationId}` };

    // We still validate internally just to ensure we didn't mess up data structures,
    // but we don't throw an error to block the user.
    const errors = BrandBrainValidator.validate(finalBuilt);
    if (errors.length > 0) {
      console.warn('BrandBrain validation warnings:', errors);
    }

    this.brains.set(finalBuilt.id, finalBuilt);
    return { ...finalBuilt };
  }
}

export const brandBrainMockService = new BrandBrainMockService();
