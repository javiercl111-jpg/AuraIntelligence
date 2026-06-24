import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Cpu,
  DollarSign,
  Filter,
  Search,
  User,
} from 'lucide-react';

import { listAuraConversations } from '../services/auraConversationService';
import type { AuraConversationAudit } from '../types/auraIntelligence';

const ConversationsAuditPage: React.FC = () => {
  const [audits, setAudits] = useState<AuraConversationAudit[]>([]);
  const [filteredAudits, setFilteredAudits] = useState<AuraConversationAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters State
  const [searchText, setSearchText] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await listAuraConversations();
      setAudits(data);
      setFilteredAudits(data);
    } catch (error) {
      console.error('[Aura Intelligence] Error loading conversations for audit:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  // Filter application logic
  useEffect(() => {
    let result = [...audits];

    if (searchText.trim()) {
      const queryText = searchText.toLowerCase();
      result = result.filter(
        (a) =>
          a.question.toLowerCase().includes(queryText) ||
          a.answer.toLowerCase().includes(queryText)
      );
    }

    if (selectedSystem) {
      result = result.filter((a) => a.system === selectedSystem);
    }

    if (selectedModule) {
      result = result.filter((a) => a.module === selectedModule);
    }

    if (selectedUserEmail.trim()) {
      const emailQuery = selectedUserEmail.toLowerCase();
      result = result.filter((a) => a.userEmail?.toLowerCase().includes(emailQuery));
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      result = result.filter((a) => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt).getTime() >= startMs;
      });
    }

    if (endDate) {
      // Add one day to endDate to make it inclusive of the end date
      const endMs = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
      result = result.filter((a) => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt).getTime() <= endMs;
      });
    }

    setFilteredAudits(result);
  }, [searchText, selectedSystem, selectedModule, selectedUserEmail, startDate, endDate, audits]);

  const toggleExpand = (id?: string) => {
    if (!id) return;
    setExpandedId((current) => (current === id ? null : id));
  };

  const getSystemLabel = (sys?: string): string => {
    if (sys === 'aura_hcm') return 'Aura HCM';
    if (sys === 'aura_maintenance') return 'Maintenance OS';
    if (sys === 'aura_signature') return 'Aura Signature';
    return sys || 'Ecosistema';
  };

  const getConfidenceBadgeColor = (conf?: string): string => {
    if (conf === 'high') return 'bg-green-500/10 border-green-500/20 text-green-300';
    if (conf === 'medium') return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
    return 'bg-red-500/10 border-red-500/20 text-red-300';
  };

  // Extract unique users, systems, modules for dropdown autofills
  const systems = Array.from(new Set(audits.map((a) => a.system).filter(Boolean)));
  const modules = Array.from(new Set(audits.map((a) => a.module).filter(Boolean)));

  return (
    <section className="col-span-full rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Aura Intelligence
          </p>
          <h2 className="mt-2 text-2xl font-black">Auditoría de Conversaciones</h2>
          <p className="mt-1 text-sm text-white/55">
            Registro real y logs de auditoría para interacciones en el ecosistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadConversations()}
          disabled={loading}
          className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="mt-6 grid gap-4 rounded-xl border border-white/5 bg-black/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <Search size={16} className="text-white/40" />
          <input
            type="text"
            placeholder="Buscar en preguntas y respuestas..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35"
          />
        </div>

        {/* User Email */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <User size={16} className="text-white/40" />
          <input
            type="text"
            placeholder="Filtrar por email de colaborador..."
            value={selectedUserEmail}
            onChange={(e) => setSelectedUserEmail(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35"
          />
        </div>

        {/* System Select */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <Filter size={16} className="text-white/40" />
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none"
          >
            <option value="" className="bg-[#101923] text-white">Todos los sistemas</option>
            {systems.map((sys) => (
              <option key={sys} value={sys} className="bg-[#101923] text-white">
                {getSystemLabel(sys)}
              </option>
            ))}
          </select>
        </div>

        {/* Module Select */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <Filter size={16} className="text-white/40" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none"
          >
            <option value="" className="bg-[#101923] text-white">Todos los módulos</option>
            {modules.map((mod) => (
              <option key={mod} value={mod} className="bg-[#101923] text-white">
                {mod}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <Calendar size={16} className="text-white/40" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <Calendar size={16} className="text-white/40" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="mt-5 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
            Cargando registros de conversación...
          </div>
        )}

        {!loading && filteredAudits.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
            No se encontraron registros de conversación que coincidan con los filtros.
          </div>
        )}

        {!loading &&
          filteredAudits.map((audit) => {
            const isExpanded = expandedId === audit.id;
            const metadata = (audit.metadata || {}) as any;
            const confidenceLabel = (metadata.responseConfidenceLabel || 'low') as string;
            const confidenceScore = (metadata.responseConfidenceScore || 0) as number;

            return (
              <article
                key={audit.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 transition hover:bg-black/20"
              >
                {/* Header Card */}
                <div
                  onClick={() => toggleExpand(audit.id)}
                  className="flex cursor-pointer items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-300">
                        {getSystemLabel(audit.system)}
                      </span>
                      {audit.module && (
                        <span className="rounded-lg bg-purple-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
                          {audit.module}
                        </span>
                      )}
                      <span className="text-[11px] text-white/40">
                        {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : ''}
                      </span>
                    </div>

                    <h3 className="mt-2 text-xs font-black text-white/95 line-clamp-1">
                      P: {audit.question}
                    </h3>
                    <p className="mt-1 text-xs text-white/60 line-clamp-1">
                      R: {audit.answer}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
                      <User size={12} />
                      <span>{audit.userEmail || 'Usuario Anónimo'}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getConfidenceBadgeColor(
                        confidenceLabel
                      )}`}
                    >
                      Confianza {confidenceScore}%
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/40 p-4 text-xs space-y-4">
                    <div>
                      <p className="font-bold text-white/70">Pregunta completa:</p>
                      <p className="mt-1 leading-relaxed text-white/80">{audit.question}</p>
                    </div>

                    <div>
                      <p className="font-bold text-white/70">Respuesta oficial redactada:</p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-white/80">
                        {audit.answer}
                      </p>
                    </div>

                    {/* Metadata Layer */}
                    <div className="grid gap-3 rounded-xl border border-white/5 bg-black/30 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Intención Detectada
                        </p>
                        <p className="mt-1 font-bold text-cyan-300">
                          {metadata.detectedIntent || 'UNKNOWN'}
                        </p>
                      </div>

                      {metadata.matchedKeywords && metadata.matchedKeywords.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Keywords coincidentes
                          </p>
                          <p className="mt-1 text-white/80">
                            {metadata.matchedKeywords.join(', ')}
                          </p>
                        </div>
                      )}

                      {metadata.aiModel && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Modelo / Motor IA
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-white/80">
                            <Cpu size={12} className="text-cyan-300" />
                            <span>{metadata.aiModel}</span>
                          </div>
                        </div>
                      )}

                      {metadata.estimatedTotalTokens !== undefined && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Tokens estimadas
                          </p>
                          <p className="mt-1 text-white/80">
                            {metadata.estimatedTotalTokens} tokens (Entrada:{' '}
                            {metadata.estimatedPromptTokens} · Salida:{' '}
                            {metadata.estimatedCompletionTokens})
                          </p>
                        </div>
                      )}

                      {metadata.estimatedCostUsd !== undefined && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Costo estimado (USD)
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-white/80">
                            <DollarSign size={12} className="text-yellow-400" />
                            <span>{metadata.estimatedCostUsd} USD</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Boundary Guard
                        </p>
                        <p className="mt-1 text-white/80">
                          Sistema: {metadata.resolvedSystem || 'Sin resolver'} · Confianza:{' '}
                          {Math.round((metadata.contextConfidence || 0) * 100)}%
                        </p>
                      </div>
                    </div>

                    {/* Sources */}
                    {metadata.sources && metadata.sources.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="font-bold text-white/70">Artículos de conocimiento usados:</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {metadata.sources.map((source: any, index: number) => (
                            <div
                              key={source.articleId || index}
                              className="rounded-xl border border-white/5 bg-black/20 p-2"
                            >
                              <p className="font-bold text-white/80">{source.title}</p>
                              <p className="text-[10px] text-white/40">
                                Módulo: {source.module || 'General'} · Categoría:{' '}
                                {source.category || 'General'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
};

export default ConversationsAuditPage;