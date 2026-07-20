// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Executive Conversation Page
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from 'react';
import { useGrowthConversation } from '../hooks/useGrowthConversation';
import ConversationBubble from './ConversationBubble';
import TypingIndicator from './TypingIndicator';
import { ContentPlanSummary } from './ContentPlanSummary';
import ExecutiveReflectionCard from './ExecutiveReflectionCard';
import ExecutiveProposalCard from './ExecutiveProposalCard';
import GrowthObjectiveSummary from './GrowthObjectiveSummary';
import BrandBrainSummary from './BrandBrainSummary';
import CampaignStrategySummary from './CampaignStrategySummary';
import { ExecutiveExecutionPlanSummary } from './ExecutiveExecutionPlanSummary';

interface ExecutiveConversationPageProps {
  onClose: () => void;
}

export const ExecutiveConversationPage: React.FC<ExecutiveConversationPageProps> = ({ onClose }) => {
  const { conversation, turns, objective, brandBrain, campaignStrategy, executionPlan, contentPlan, isTyping, error, start, addTurn } = useGrowthConversation();
  const [inputValue, setInputValue] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (endOfMessagesRef.current?.scrollIntoView) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, isTyping, objective]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    addTurn(inputValue);
    setInputValue('');
  };

  if (error) {
    return (
      <div className="p-8 text-center bg-[#0d1117] rounded-2xl border border-red-500/20">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
        >
          Volver
        </button>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex justify-center items-center h-64">
        <TypingIndicator />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[800px] w-full max-w-4xl mx-auto bg-[#0d1117] border border-emerald-400/20 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-emerald-400/20 bg-emerald-950/30">
        <div>
          <h2 className="text-lg font-bold text-white">Executive Growth Conversation</h2>
          <p className="text-xs text-emerald-300/70 tracking-widest uppercase">Mock Session (No AI)</p>
        </div>
        <button 
          onClick={onClose}
          className="text-emerald-400/60 hover:text-emerald-400 transition-colors"
          aria-label="Cerrar conversación"
        >
          ✕
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {turns.map((turn, index) => {
          const isLastTurn = index === turns.length - 1;
          
          return (
            <React.Fragment key={turn.id}>
              <ConversationBubble content={turn.content} role={turn.role} />
              
              {/* Inject Objective Summary before Reflection Card */}
              {isLastTurn && turn.role === 'assistant' && conversation.currentStage === 'executive_reflection' && (
                <div className="mb-4 flex flex-col gap-6">
                  {objective && <GrowthObjectiveSummary objective={objective} />}
                  {brandBrain && <BrandBrainSummary brain={brandBrain} />}
                  {campaignStrategy && <CampaignStrategySummary strategy={campaignStrategy} />}
                  {executionPlan && <ExecutiveExecutionPlanSummary plan={executionPlan} />}
                  {contentPlan && <ContentPlanSummary plan={contentPlan} />}
                  <ExecutiveReflectionCard context={conversation.structuredContext} />
                </div>
              )}
              
              {/* Inject Proposal Card after assistant introduces it */}
              {isLastTurn && turn.role === 'assistant' && (conversation.currentStage === 'executive_proposal' || conversation.currentStage === 'completed') && (
                <ExecutiveProposalCard context={conversation.structuredContext} plan={executionPlan} contentPlan={contentPlan} />
              )}
            </React.Fragment>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start mb-4">
            <TypingIndicator />
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-emerald-950/20 border-t border-emerald-400/10">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping || conversation.status === 'completed'}
            placeholder={
              conversation.status === 'completed' 
                ? 'Conversación finalizada' 
                : 'Escribe tu respuesta...'
            }
            className="flex-1 bg-[#1a202c]/50 border border-emerald-400/20 rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping || conversation.status === 'completed'}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-500/50 text-emerald-950 font-bold rounded-xl transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExecutiveConversationPage;
