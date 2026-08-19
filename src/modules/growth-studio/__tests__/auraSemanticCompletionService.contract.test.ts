import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  AuraSemanticCompletionProvider,
} from '../../../types/auraSemanticCompletion';

import {
  AuraSemanticCompletionService,
} from '../../../services/auraSemanticCompletionService';

const request = {
  requestId:
    'semantic:core:test',

  systemInstruction:
    'Return structured semantic analysis.',

  userPayload:
    '{"signals":[],"products":[]}',
};

describe(
  'AuraSemanticCompletionService contract',
  () => {

    it(
      'fails closed when no provider is configured',
      async () => {
        const service =
          new AuraSemanticCompletionService(
            null,
          );

        expect(
          await service.isAvailable(),
        ).toBe(false);

        const result =
          await service.complete(
            request,
          );

        expect(result.status)
          .toBe('unavailable');

        expect(result.content)
          .toBeUndefined();
      },
    );

    it(
      'returns unavailable when provider health is false',
      async () => {
        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'fake-provider',

            async isAvailable() {
              return false;
            },

            async complete() {
              throw new Error(
                'must not execute',
              );
            },
          };

        const result =
          await new AuraSemanticCompletionService(
            provider,
          ).complete(request);

        expect(result.status)
          .toBe('unavailable');

        expect(result.provider)
          .toBe('fake-provider');
      },
    );

    it(
      'returns available only for non-empty completion content',
      async () => {
        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'fake-provider',

            async isAvailable() {
              return true;
            },

            async complete() {
              return {
                content:
                  '{"matches":[],"knowledgeGaps":[]}',

                model:
                  'fake-model',

                tokenUsage:
                  42,
              };
            },
          };

        const result =
          await new AuraSemanticCompletionService(
            provider,
          ).complete(request);

        expect(result.status)
          .toBe('available');

        expect(result.content)
          .toContain('"matches"');

        expect(result.provider)
          .toBe('fake-provider');

        expect(result.model)
          .toBe('fake-model');

        expect(result.tokenUsage)
          .toBe(42);
      },
    );

    it(
      'fails closed for empty provider content',
      async () => {
        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'fake-provider',

            async isAvailable() {
              return true;
            },

            async complete() {
              return {
                content: '   ',
              };
            },
          };

        const result =
          await new AuraSemanticCompletionService(
            provider,
          ).complete(request);

        expect(result.status)
          .toBe('failed');

        expect(result.content)
          .toBeUndefined();
      },
    );

    it(
      'fails closed when provider execution throws',
      async () => {
        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'fake-provider',

            async isAvailable() {
              return true;
            },

            async complete() {
              throw new Error(
                'provider failure',
              );
            },
          };

        const result =
          await new AuraSemanticCompletionService(
            provider,
          ).complete(request);

        expect(result.status)
          .toBe('failed');

        expect(result.content)
          .toBeUndefined();
      },
    );
  },
);
