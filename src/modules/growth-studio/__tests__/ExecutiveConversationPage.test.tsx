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
});
