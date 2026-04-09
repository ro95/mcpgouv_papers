'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import EntreprisesApiService from '../services/entreprises.api.service';

interface ExportButtonProps {
  /** Filtres actuels à appliquer pour l'export */
  params: {
    days?: number;
    departement?: string;
    activitePrincipale?: string;
    sectionActivite?: string;
    trancheEffectifSalarie?: string;
    etatAdministratif?: 'A' | 'C';
  };
  /** Nombre total de résultats affichés (pour info) */
  totalResults?: number;
}

type ExportState = 'idle' | 'loading' | 'success' | 'error';

export function ExportButton({ params, totalResults }: ExportButtonProps) {
  const [state, setState] = useState<ExportState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = async () => {
    setState('loading');
    setErrorMsg('');

    try {
      await EntreprisesApiService.exportCsv({
        ...params,
        limit: 50,
      });
      setState('success');
      setTimeout(() => setState('idle'), 3000);
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors de l\'export',
      );
      setTimeout(() => setState('idle'), 5000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={state === 'loading'}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all border
          ${state === 'loading'
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
            : state === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : state === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-[#003189] border-[#003189]/30 hover:bg-[#003189]/5 hover:border-[#003189]'
          }
        `}
      >
        {state === 'loading' && (
          <>
            <Loader2 size={16} className="animate-spin" />
            Export en cours…
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle size={16} />
            CSV téléchargé !
          </>
        )}
        {state === 'error' && (
          <>
            <AlertCircle size={16} />
            Erreur
          </>
        )}
        {state === 'idle' && (
          <>
            <Download size={16} />
            Exporter CSV avec emails
          </>
        )}
      </button>

      {state === 'loading' && (
        <span className="text-xs text-gray-400">
          Enrichissement de {Math.min(totalResults ?? 50, 50)} entreprises via Pappers…
        </span>
      )}

      {state === 'error' && errorMsg && (
        <span className="text-xs text-red-500">{errorMsg}</span>
      )}

      {state === 'idle' && (
        <span className="text-xs text-gray-400">
          Max 50 entreprises · uniquement celles avec email
        </span>
      )}
    </div>
  );
}
