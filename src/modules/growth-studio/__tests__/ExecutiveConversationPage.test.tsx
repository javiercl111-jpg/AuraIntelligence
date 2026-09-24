import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowthI18nProvider } from '../i18n/GrowthI18nProvider';
import { GrowthRuntimeProvider } from '../runtime/GrowthRuntimeProvider';
import ExecutiveConversationPage from '../components/ExecutiveConversationPage';
import { setProductionResponseDelay as setMockResponseDelay } from '../services/growthConversationProductionService';
import '@testing-library/jest-dom';

vi.mock('../../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue(
        'test-growth-advisor-id-token',
      ),
    },
  },
}));
const TEST_BRIDGE_URL = 'test-local://growth-advisor';

const growthAdvisorFetchMock = vi.fn(
  async (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const body =
      typeof init?.body === 'string'
        ? JSON.parse(init.body)
        : {};

    const askedQuestions =
      Array.isArray(body.askedQuestions)
        ? body.askedQuestions
        : [];

    const questions: Record<number, string> = {
      1: '¿Qué producto, servicio o línea de negocio quieres impulsar?',
      2: '¿A qué audiencia o segmento deseas llegar?',
      3: '¿En qué región o mercado quieres concentrar esta estrategia?',
      4: '¿En qué canales o medios quieres desarrollar esta estrategia?',
      5: '¿Qué acción quieres que realice la audiencia después de ver el contenido?',
      6: '¿Hay alguna consideración adicional que debamos tomar en cuenta?',
    };

    const nextQuestion =
      questions[askedQuestions.length] ??
      '¿Hay alguna consideración adicional que debamos tomar en cuenta?';

    return {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        ok: true,
        conversationProposal: {
          nextQuestion,
        },
      }),
    } as unknown as Response;
  },
);

describe('ExecutiveConversationPage', () => {
  beforeEach(() => {
    setMockResponseDelay(0);
    vi.stubEnv('VITE_GROWTH_ADVISOR_BRIDGE_URL', TEST_BRIDGE_URL);
    vi.stubGlobal('fetch', growthAdvisorFetchMock);
    growthAdvisorFetchMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('renders and starts conversation', async () => {
    render(
      <GrowthI18nProvider>
          <GrowthRuntimeProvider>
        <ExecutiveConversationPage
          onClose={() => {}}
        />
      </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
    );

    // Wait for the header and conversation to load
    await waitFor(() => {
      expect(screen.getByText('Conversación Ejecutiva de Crecimiento')).toBeInTheDocument();
    });
    expect(screen.getByText('Sesión de demostración · Sin IA productiva')).toBeInTheDocument();

    // Wait for the first assistant message
    await waitFor(() => {
      expect(screen.getByText(/¡Hola! Soy tu asistente de Aura Growth Studio/i)).toBeInTheDocument();
    });
  });

  it('blocks double submission while typing', async () => {
    // Add artificial delay just for this test to catch the "isTyping" state
    setMockResponseDelay(100);
    render(
      <GrowthI18nProvider>
          <GrowthRuntimeProvider>
        <ExecutiveConversationPage
          onClose={() => {}}
        />
      </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe tu respuesta...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Escribe tu respuesta...');
    const submitBtn = screen.getByRole('button', { name: /enviar/i });

    fireEvent.change(input, { target: { value: 'Mi objetivo' } });

    // First submit
    fireEvent.click(submitBtn);

    // Button should be disabled during "isTyping" delay
    expect(submitBtn).toBeDisabled();

    // The button will be disabled because the input was cleared,
    // so we check if the input is no longer disabled (isTyping finished).
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it('prevents submission of empty strings', async () => {
    setMockResponseDelay(0);
    render(
      <GrowthI18nProvider>
          <GrowthRuntimeProvider>
        <ExecutiveConversationPage
          onClose={() => {}}
        />
      </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe tu respuesta...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Escribe tu respuesta...');
    const submitBtn = screen.getByRole('button', { name: /enviar/i });

    fireEvent.change(input, { target: { value: '    ' } });

    // The button itself is disabled if string is empty
    expect(submitBtn).toBeDisabled();
  });

  it('progresa por el flujo completo y verifica los resúmenes de Objective y Brand Brain en la UI', async () => {
    setMockResponseDelay(0);
    render(
      <GrowthI18nProvider>
          <GrowthRuntimeProvider>
        <ExecutiveConversationPage
          onClose={() => {}}
        />
      </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
    );

    // 1. Iniciar product-first / waiting for product
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe tu respuesta...')).toBeInTheDocument();
    });

    // Verificar que NO se renderizan los resúmenes en etapas iniciales
    expect(screen.queryAllByText(/Objetivo de Crecimiento/i)).toHaveLength(0);
    expect(screen.queryAllByText(/Memoria de Identidad/i)).toHaveLength(0);
    expect(screen.queryAllByText(/Nivel de conocimiento de marca/i)).toHaveLength(0);

    const input = screen.getByPlaceholderText('Escribe tu respuesta...');
    const submitBtn = screen.getByRole('button', { name: /enviar/i });

    await waitFor(() => {
      expect(
        screen.getByText(/producto, servicio o línea de negocio quieres impulsar/i),
      ).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    // Enviar Producto (Quiero vender Aura HCM)
    fireEvent.change(input, { target: { value: 'Quiero vender Aura HCM' } });
    fireEvent.click(submitBtn);

    fireEvent.change(input, { target: { value: 'Hoteles' } });
    fireEvent.click(submitBtn);

    // Enviar Audiencia (Hoteles)
    await waitFor(() => {
      expect(
        screen.getByText(/audiencia o segmento deseas llegar/i),
      ).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: 'Hoteles' } });
    fireEvent.click(submitBtn);

    // Enviar Región (México)
    await waitFor(() => {
      expect(
        screen.getByText(/región o mercado quieres concentrar esta estrategia/i),
      ).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: 'México' } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText(/resultado|objetivo/i),
      ).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    // Enviar Objetivo / Resultado esperado
    fireEvent.change(input, { target: { value: 'Incrementar ventas 20%' } });
    fireEvent.click(submitBtn);
    // El flujo vigente solicita canales antes de la reflexión.
    await waitFor(() => {
      expect(
        screen.getByText(/¿En qué canales o medios quieres desarrollar esta estrategia/i),
      ).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    fireEvent.change(input, {
      target: {
        value: 'LinkedIn, email',
      },
    });
    fireEvent.click(submitBtn);

    // Después de canales, el flujo solicita el CTA principal.
    await waitFor(() => {
      expect(
        screen.getByText(/¿Qué acción quieres que realice la audiencia después de ver el contenido/i),
      ).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    fireEvent.change(input, {
      target: {
        value: 'Agendar una demostración',
      },
    });
    fireEvent.click(submitBtn);

    // Esperar a llegar a la fase executive_reflection
    await waitFor(() => {
      // Debería renderizarse el Resumen del Objetivo
      expect(screen.getAllByText(/Objetivo de Crecimiento/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      // Debería renderizarse el Brand Brain Summary
      expect(screen.getByRole('heading', { name: /Memoria de Identidad/i, level: 3 })).toBeInTheDocument();
    });

    await waitFor(() => {
      // Debería renderizarse el ConfidenceIndicator
      expect(screen.getByText(/Nivel de conocimiento de marca/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      // Debería renderizarse el KnowledgeGapCard con vacíos (por ejemplo, diferenciadores o propuesta de valor que están en missing)
      expect(screen.getByText(/Vacíos de Conocimiento/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Diferenciadores/i).length).toBeGreaterThan(0);
    });

    // Confirmación: Enviar "sí, es correcto"
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: 'sí, es correcto' } });
    fireEvent.click(submitBtn);

    // Llegamos a la propuesta
    await waitFor(() => {
      // Debería aparecer la propuesta preliminar
      expect(screen.getByText(/Propuesta preliminar de demostración/i)).toBeInTheDocument();
      // Los resúmenes no deberían seguir mostrándose en esta etapa si la UI los oculta
      expect(screen.queryAllByText(/Objetivo de Crecimiento/i)).toHaveLength(0);
      expect(screen.queryAllByText(/Memoria de Identidad/i)).toHaveLength(0);
    });
  });
});
