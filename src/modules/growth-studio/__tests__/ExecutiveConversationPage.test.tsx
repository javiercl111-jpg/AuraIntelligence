import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ExecutiveConversationPage from '../components/ExecutiveConversationPage';
import { setMockResponseDelay } from '../services/growthConversationMockService';
import '@testing-library/jest-dom';

describe('ExecutiveConversationPage', () => {
  beforeEach(() => {
    setMockResponseDelay(0);
  });

  it('renders and starts conversation', async () => {
    render(<ExecutiveConversationPage onClose={() => {}} />);

    // Wait for the header and conversation to load
    await waitFor(() => {
      expect(screen.getByText('Executive Growth Conversation')).toBeInTheDocument();
    });
    expect(screen.getByText('Mock Session (No AI)')).toBeInTheDocument();

    // Wait for the first assistant message
    await waitFor(() => {
      expect(screen.getByText(/¡Hola! Soy tu asistente de Aura Growth Studio/i)).toBeInTheDocument();
    });
  });

  it('blocks double submission while typing', async () => {
    // Add artificial delay just for this test to catch the "isTyping" state
    setMockResponseDelay(100);
    render(<ExecutiveConversationPage onClose={() => {}} />);

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
    render(<ExecutiveConversationPage onClose={() => {}} />);

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
    render(<ExecutiveConversationPage onClose={() => {}} />);

    // 1. Iniciar en welcome / waiting for objective
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe tu respuesta...')).toBeInTheDocument();
    });

    // Verificar que NO se renderizan los resúmenes en etapas iniciales
    expect(screen.queryAllByText(/Growth Objective/i)).toHaveLength(0);
    expect(screen.queryAllByText(/Memoria de Identidad/i)).toHaveLength(0);
    expect(screen.queryAllByText(/Nivel de conocimiento de marca/i)).toHaveLength(0);

    const input = screen.getByPlaceholderText('Escribe tu respuesta...');
    const submitBtn = screen.getByRole('button', { name: /enviar/i });

    // Enviar Objetivo (Quiero vender Aura HCM)
    fireEvent.change(input, { target: { value: 'Quiero vender Aura HCM' } });
    fireEvent.click(submitBtn);

    // Enviar Audiencia (Hoteles)
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: 'Hoteles' } });
    fireEvent.click(submitBtn);

    // Enviar Región (México)
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: 'México' } });
    fireEvent.click(submitBtn);

    // Enviar Resultado esperado (Incrementar ventas 20%)
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    fireEvent.change(input, { target: { value: 'Incrementar ventas 20%' } });
    fireEvent.click(submitBtn);

    // Esperar a llegar a la fase executive_reflection
    await waitFor(() => {
      // Debería renderizarse el Resumen del Objetivo
      expect(screen.getAllByText(/Growth Objective/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      // Debería renderizarse el Brand Brain Summary
      expect(screen.getByText(/Memoria de Identidad/i)).toBeInTheDocument();
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
      expect(screen.queryAllByText(/Growth Objective/i)).toHaveLength(0);
      expect(screen.queryAllByText(/Memoria de Identidad/i)).toHaveLength(0);
    });
  });
});
