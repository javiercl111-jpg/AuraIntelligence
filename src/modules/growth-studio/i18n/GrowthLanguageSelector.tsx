import {
  Languages,
} from 'lucide-react';

import {
  useGrowthI18n,
} from './GrowthI18nProvider';

export default function GrowthLanguageSelector() {
  const {
    locale,
    messages,
    setLocale,
  } = useGrowthI18n();

  return (
    <div
      aria-label={
        messages.language.selectorLabel
      }
      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] p-1"
    >
      <Languages
        size={15}
        className="ml-2 mr-1 text-cyan-300"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() =>
          setLocale('es')
        }
        aria-pressed={
          locale === 'es'
        }
        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
          locale === 'es'
            ? 'bg-cyan-300/15 text-cyan-200'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        ES
      </button>

      <button
        type="button"
        onClick={() =>
          setLocale('en')
        }
        aria-pressed={
          locale === 'en'
        }
        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
          locale === 'en'
            ? 'bg-cyan-300/15 text-cyan-200'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        EN
      </button>
    </div>
  );
}
