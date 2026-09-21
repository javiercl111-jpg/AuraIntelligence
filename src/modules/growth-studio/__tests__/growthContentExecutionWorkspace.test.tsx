import {
  renderToStaticMarkup,
} from 'react-dom/server';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const runtimeState =
  vi.hoisted(
    () => ({
      current: {
        campaignStrategy:
          null as
            | null
            | {
                readinessScore:
                  number;
              },
        execution:
          null as
            | null
            | {
                status:
                  string;
              },
        contentPlan:
          null as
            | null
            | {
                status:
                  string;
                contentAssets:
                  Array<{
                    id:
                      string;
                  }>;
              },
        contentBrief:
          null as
            | null
            | {
                status:
                  string;
              },
      },
    }),
  );

vi.mock(
  '../runtime/GrowthRuntimeProvider',
  () => ({
    useGrowthRuntime:
      () =>
        runtimeState.current,
  }),
);

vi.mock(
  '../i18n/GrowthI18nProvider',
  () => ({
    useGrowthI18n:
      () => ({
        messages: {
          nav: {
            contentExecution:
              'Contenido y Ejecución',
            contentExecutionDescription:
              'Contenido, activos y preparación operativa.',
          },
          advisorPresentation: {
            executiveExecutionPlan:
              'Plan Ejecutivo de Ejecución',
            contentPlanning:
              'Planificación de Contenido',
            executiveContentBrief:
              'Brief Ejecutivo de Contenido',
          },
        },
      }),
  }),
);

vi.mock(
  '../components/ExecutiveExecutionPlanSummary',
  () => ({
    ExecutiveExecutionPlanSummary:
      () => (
        <div>
          EXECUTION_SUMMARY
        </div>
      ),
  }),
);

vi.mock(
  '../components/ContentPlanSummary',
  () => ({
    ContentPlanSummary:
      () => (
        <div>
          CONTENT_PLAN_SUMMARY
        </div>
      ),
  }),
);

vi.mock(
  '../components/ExecutiveContentBriefSummary',
  () => ({
    ExecutiveContentBriefSummary:
      () => (
        <div>
          CONTENT_BRIEF_SUMMARY
        </div>
      ),
  }),
);

import GrowthContentExecutionWorkspace from '../product/GrowthContentExecutionWorkspace';

describe(
  'AGFC01 | GrowthContentExecutionWorkspace',
  () => {
    it(
      'renders a useful fail-closed empty state instead of a blank content page',
      () => {
        runtimeState.current = {
          campaignStrategy:
            null,
          execution:
            null,
          contentPlan:
            null,
          contentBrief:
            null,
        };

        const html =
          renderToStaticMarkup(
            <GrowthContentExecutionWorkspace />,
          );

        expect(
          html,
        ).toContain(
          'Contenido y Ejecución',
        );

        expect(
          html,
        ).toContain(
          'Aún no hay artefactos de ejecución preparados',
        );

        expect(
          html,
        ).toContain(
          'Publicación no habilitada',
        );

        expect(
          html,
        ).not.toContain(
          'EXECUTION_SUMMARY',
        );
      },
    );

    it(
      'surfaces the existing execution, content plan and content brief artifacts',
      () => {
        runtimeState.current = {
          campaignStrategy: {
            readinessScore:
              84,
          },
          execution: {
            status:
              'confirmed',
          },
          contentPlan: {
            status:
              'confirmed',
            contentAssets: [
              {
                id:
                  'asset-1',
              },
              {
                id:
                  'asset-2',
              },
            ],
          },
          contentBrief: {
            status:
              'review_required',
          },
        };

        const html =
          renderToStaticMarkup(
            <GrowthContentExecutionWorkspace />,
          );

        expect(
          html,
        ).toContain(
          '84/100',
        );

        expect(
          html,
        ).toContain(
          'EXECUTION_SUMMARY',
        );

        expect(
          html,
        ).toContain(
          'CONTENT_PLAN_SUMMARY',
        );

        expect(
          html,
        ).toContain(
          'CONTENT_BRIEF_SUMMARY',
        );

        expect(
          html,
        ).toContain(
          'Publicación no habilitada',
        );
      },
    );
  },
);