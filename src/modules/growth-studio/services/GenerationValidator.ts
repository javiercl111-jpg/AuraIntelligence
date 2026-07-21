import type { ValidationReport, ValidationViolation, ExecutiveGenerationRequest, GenerationDraftStatus } from '../types';
import type { ProviderResponse } from './contracts/IAIProviderAdapter';

export class GenerationValidator {
  public validate(request: ExecutiveGenerationRequest, response: ProviderResponse): ValidationReport {
    // 1. Technical Contract Validation
    if (!response || !response.content || response.content.trim().length === 0) {
      return {
        status: 'rejected',
        score: 0,
        warnings: [],
        violations: [
          { ruleId: 'TECH_001', description: 'Provider response is empty or corrupt', severity: 'high' }
        ],
        recommendations: ['Retry generation with a different provider or check provider health.']
      };
    }

    const violations: ValidationViolation[] = [];
    const warnings: string[] = [];
    let score = 100;

    // 2. Constraints Validation (Zero Trust)
    for (const constraint of request.providerConstraints) {
      // Mock validation: check if constraint words appear as violations in content
      // In a real scenario, this would use NLP or another LLM to verify constraint adherence
      if (response.content.toLowerCase().includes('invented_data')) {
         violations.push({
           ruleId: 'CONST_001',
           description: `Failed to adhere to constraint: ${constraint}`,
           severity: 'high'
         });
         score -= 20;
      }
    }

    // 3. Completeness Validation
    for (const section of request.contentSections) {
      if (section.requiredElements) {
        for (const el of section.requiredElements) {
          if (!response.content.toLowerCase().includes(el.toLowerCase())) {
            warnings.push(`Missing required element: ${el} in section ${section.heading}`);
            score -= 5;
          }
        }
      }
    }

    // Determine status
    let status: GenerationDraftStatus = 'approved';

    if (violations.some(v => v.severity === 'high')) {
      status = 'revision_required';
    } else if (warnings.length > 0 || violations.length > 0) {
      status = 'validation_required';
    }

    // If score drops too low, require revision regardless
    if (score < 70 && status !== 'revision_required') {
       status = 'validation_required';
    }

    return {
      status,
      score: Math.max(0, score),
      warnings,
      violations,
      recommendations: status !== 'approved' ? ['Review the generated content against the highlighted warnings and violations.'] : []
    };
  }
}
