import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace, ReviewCategoryScore } from '../../types';

export interface IExecutiveReviewer {
  evaluate(
    draft: Readonly<GeneratedContentDraft>,
    brief: Readonly<ExecutiveContentBrief>,
    traces: ReadonlyArray<GenerationTrace>
  ): Promise<ReviewCategoryScore>;
}
