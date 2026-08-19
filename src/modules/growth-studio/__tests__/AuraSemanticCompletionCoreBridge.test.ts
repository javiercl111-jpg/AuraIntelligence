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

import {
  AuraSemanticCompletionCoreBridge,
} from '../services/AuraSemanticCompletionCoreBridge';

const request = {
  requestId:
    'semantic:bridge:test',

  systemInstruction:
    'Return JSON only.',

  userPayload:
    '{"signals":[],"products":[]}',
};

describe(
  'AuraSemanticCompletionCoreBridge',
  () => {

    it(
      'bridges Growth semantic completion to Intelligence Core',
      async () => {
        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'fake-core-provider',

            async isAvailable() {
              return true;
            },

            async complete(input) {
              expect(
                input.requestId,
              ).toBe(
                request.requestId,
              );

              expect(
                input.systemInstruction,
              ).toBe(
                request.systemInstruction,
              );

              expect(
                input.userPayload,
              ).toBe(
                request.userPayload,
              );

              return {
                content:
                  '{"matches":[],"knowledgeGaps":[]}',

                model:
                  'fake-core-model',

                tokenUsage:
                  25,
              };
            },
          };

        const core =
          new AuraSemanticCompletionService(
            provider,
          );

        const bridge =
          new AuraSemanticCompletionCoreBridge(
            core,
          );

        expect(
          await bridge.isAvailable(),
        ).toBe(true);

        const result =
          await bridge.complete(
            request,
          );

        expect(result.content)
          .toContain('"matches"');

        expect(result.provider)
          .toBe(
            'fake-core-provider',
          );

        expect(result.model)
          .toBe(
            'fake-core-model',
          );

        expect(result.tokenUsage)
          .toBe(25);
      },
    );

    it(
      'reports unavailable when Intelligence Core has no provider',
      async () => {
        const core =
          new AuraSemanticCompletionService(
            null,
          );

        const bridge =
          new AuraSemanticCompletionCoreBridge(
            core,
          );

        expect(
          await bridge.isAvailable(),
        ).toBe(false);
      },
    );

    it(
      'fails closed when Core completion is unavailable',
      async () => {
        const core =
          new AuraSemanticCompletionService(
            null,
          );

        const bridge =
          new AuraSemanticCompletionCoreBridge(
            core,
          );

        await expect(
          bridge.complete(
            request,
          ),
        ).rejects.toThrow();
      },
    );

    it(
      'fails closed when provider execution fails',
      async () => {
        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'failing-provider',

            async isAvailable() {
              return true;
            },

            async complete() {
              throw new Error(
                'provider failure',
              );
            },
          };

        const core =
          new AuraSemanticCompletionService(
            provider,
          );

        const bridge =
          new AuraSemanticCompletionCoreBridge(
            core,
          );

        await expect(
          bridge.complete(
            request,
          ),
        ).rejects.toThrow();
      },
    );

    it(
      'does not expose provider implementation details in the Growth port request',
      async () => {
        let captured:
          Record<string, unknown> | null =
            null;

        const provider:
          AuraSemanticCompletionProvider = {
            providerId:
              'opaque-provider',

            async isAvailable() {
              return true;
            },

            async complete(input) {
              captured = {
                ...input,
              };

              return {
                content:
                  '{"matches":[],"knowledgeGaps":[]}',
              };
            },
          };

        const bridge =
          new AuraSemanticCompletionCoreBridge(
            new AuraSemanticCompletionService(
              provider,
            ),
          );

        await bridge.complete(
          request,
        );

        const serialized =
          JSON.stringify(captured);

        expect(serialized)
          .not.toContain(
            'apiKey',
          );

        expect(serialized)
          .not.toContain(
            'providerId',
          );

        expect(serialized)
          .not.toContain(
            'modelId',
          );
      },
    );
  },
);
