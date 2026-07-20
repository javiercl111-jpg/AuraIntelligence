// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Conversation Bubble
// ─────────────────────────────────────────────────────────────

import React from 'react';

interface ConversationBubbleProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

export const ConversationBubble: React.FC<ConversationBubbleProps> = ({ content, role }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm md:text-base leading-relaxed ${
          isUser
            ? 'bg-emerald-600/20 text-emerald-50 border border-emerald-500/20'
            : 'bg-[#1a202c]/60 text-emerald-100 border border-emerald-400/10 shadow-lg shadow-black/20'
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default ConversationBubble;
