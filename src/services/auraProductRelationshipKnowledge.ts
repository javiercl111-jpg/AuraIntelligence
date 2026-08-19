import type {
  ComplementaryProductRelationship,
} from '../modules/growth-studio/services/CommercialSolutionDecisionEngine';

export interface AuraProductRelationshipEvidence {
  readonly id: string;

  readonly sourceType:
    | 'product_document'
    | 'company_document'
    | 'intelligence'
    | 'manual';

  readonly sourceRef?: string;

  readonly label: string;
}

export interface AuraProductRelationshipDefinition {
  readonly primaryProductContextId: string;
  readonly supportingProductContextId: string;

  readonly reason: string;

  /**
   * Evidence IDs supporting this specific relationship.
   *
   * A relationship without evidence MUST NOT become
   * commercial bundle authority.
   */
  readonly evidenceIds: readonly string[];
}

export interface AuraProductRelationshipKnowledgeInput {
  readonly relationships:
    readonly AuraProductRelationshipDefinition[];

  readonly evidence:
    readonly AuraProductRelationshipEvidence[];
}

export class AuraProductRelationshipKnowledge {
  private static hasEvidence(
    availableEvidence:
      readonly AuraProductRelationshipEvidence[],
    evidenceIds:
      readonly string[],
  ): boolean {
    if (evidenceIds.length === 0) {
      return false;
    }

    const available =
      new Set(
        availableEvidence.map(
          item => item.id,
        ),
      );

    return evidenceIds.every(
      id => available.has(id),
    );
  }

  static resolve(
    input:
      AuraProductRelationshipKnowledgeInput,
  ): ComplementaryProductRelationship[] {
    const resolved:
      ComplementaryProductRelationship[] = [];

    const seen =
      new Set<string>();

    for (
      const relationship of
      input.relationships
    ) {
      if (
        !relationship.primaryProductContextId ||
        !relationship.supportingProductContextId ||
        relationship.primaryProductContextId ===
          relationship.supportingProductContextId
      ) {
        continue;
      }

      if (
        !relationship.reason.trim()
      ) {
        continue;
      }

      if (
        !this.hasEvidence(
          input.evidence,
          relationship.evidenceIds,
        )
      ) {
        continue;
      }

      const key =
        `${relationship.primaryProductContextId}` +
        `->${relationship.supportingProductContextId}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      resolved.push({
        primaryProductContextId:
          relationship.primaryProductContextId,

        supportingProductContextId:
          relationship.supportingProductContextId,

        reason:
          relationship.reason,

        evidenceIds:
          [...relationship.evidenceIds],
      });
    }

    return resolved;
  }
}
