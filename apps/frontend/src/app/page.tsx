'use client';

import { useState, useCallback } from 'react';
import { StatsPanel } from '@/features/entreprises/components/StatsPanel';
import { EntreprisesList } from '@/features/entreprises/components/EntreprisesList';
import { SearchFilters, SearchBar } from '@/features/entreprises/components/SearchFilters';
import { EntrepriseDetailPanel } from '@/features/entreprises/components/EntrepriseDetailPanel';
import { ExportButton } from '@/features/entreprises/components/ExportButton';
import {
  useRecentEntreprises,
  useSearchEntreprises,
} from '@/features/entreprises/hooks/useEntreprises';
import type {
  RecentEntreprisesParams,
  SearchEntreprisesParams,
  Entreprise,
} from '@/features/entreprises/types/entreprise.types';

// ─────────────────────────────────────────────
// Cibles prospection prédéfinies
// Chaque preset = un secteur où le besoin de site web est fort + décision rapide
// ─────────────────────────────────────────────
// Les sections sont les lettres de la nomenclature INSEE (NACE) :
// F=Construction, Q=Santé, I=Hébergement/Restauration, S=Autres services, M=Conseil, L=Immobilier
const PROSPECTION_PRESETS = [
  { label: '🔨 Artisans BTP',       section: 'F', desc: 'Plombier, électricien, maçon, peintre...' },
  { label: '💆 Santé libérale',     section: 'Q', desc: 'Kiné, ostéo, psychologue, orthophoniste...' },
  { label: '✂️ Coiffure & beauté',  section: 'S', desc: 'Salon coiffure, esthétique, spa...' },
  { label: '🍽️ Restauration',       section: 'I', desc: 'Restaurant, snack, café, traiteur...' },
  { label: '💼 Conseil & coaching', section: 'M', desc: 'Consultant, coach, formateur, architecte...' },
  { label: '🏠 Immobilier',         section: 'L', desc: 'Agent, transaction, gestion locative...' },
];

type Mode = 'recent' | 'search';

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('recent');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedEntreprise, setSelectedEntreprise] = useState<Entreprise | null>(null);

  const [recentParams, setRecentParams] = useState<RecentEntreprisesParams>({
    days: 30,
    page: 1,
    perPage: 18,
  });

  const [searchParams, setSearchParams] = useState<SearchEntreprisesParams>({
    page: 1,
    perPage: 18,
    etatAdministratif: 'A',
  });
  const [searchEnabled, setSearchEnabled] = useState(false);

  const recentQuery = useRecentEntreprises(recentParams);
  const searchQuery = useSearchEntreprises(searchParams, searchEnabled);
  const currentQuery = mode === 'recent' ? recentQuery : searchQuery;

  const handleFiltersChange = useCallback((params: RecentEntreprisesParams) => {
    setRecentParams((prev) => ({ ...prev, ...params, page: 1 }));
    setMode('recent');
    setActivePreset(null);
  }, []);

  const handlePreset = useCallback((preset: typeof PROSPECTION_PRESETS[0]) => {
    const isActive = activePreset === preset.section;
    if (isActive) {
      setActivePreset(null);
      setRecentParams((prev) => ({ ...prev, sectionActivite: undefined, page: 1 }));
    } else {
      setActivePreset(preset.section);
      setRecentParams((prev) => ({ ...prev, sectionActivite: preset.section, activitePrincipale: undefined, page: 1 }));
      setMode('recent');
    }
  }, [activePreset]);

  const handleSearch = useCallback((query: string) => {
    if (!query) { setMode('recent'); return; }
    setSearchParams((prev) => ({ ...prev, q: query, page: 1 }));
    setSearchEnabled(true);
    setMode('search');
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (mode === 'recent') setRecentParams((prev) => ({ ...prev, page }));
    else setSearchParams((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  // Filtrer les ND côté frontend (entreprises non diffusibles, inutiles pour prospecter)
  const filterResults = useCallback((data: typeof currentQuery.data) => {
    if (!data) return data;
    return {
      ...data,
      results: data.results.filter(
        (e: Entreprise) => e.nomRaisonSociale !== 'ND' && e.nomRaisonSociale !== ''
      ),
    };
  }, []);

  const filteredData = filterResults(currentQuery.data);
  const days = recentParams.days ?? 30;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Récentes ouvertures d&apos;entreprises
        </h1>
        <p className="text-gray-500 text-base">
          Explorez les créations d&apos;entreprises françaises en temps réel via les données ouvertes SIRENE.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <StatsPanel days={days} />
      </div>

      {/* ── Raccourcis prospection ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          🎯 Cibles prospection web
        </p>
        <div className="flex flex-wrap gap-2">
          {PROSPECTION_PRESETS.map((preset) => {
            const isActive = activePreset === preset.section;
            return (
              <button
                key={preset.section}
                onClick={() => handlePreset(preset)}
                title={preset.desc}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-[#003189] text-white border-[#003189] shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#003189] hover:text-[#003189]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          {activePreset && (
            <button
              onClick={() => { setActivePreset(null); setRecentParams((p) => ({ ...p, sectionActivite: undefined, page: 1 })); }}
              className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300"
            >
              Tout voir
            </button>
          )}
        </div>
      </div>

      {/* Recherche libre */}
      <div className="mb-4">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Filtres avancés */}
      {mode === 'recent' && (
        <div className="mb-6">
          <SearchFilters onChange={handleFiltersChange} isLoading={recentQuery.isLoading} />
        </div>
      )}

      {mode === 'search' && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Mode : <strong>Recherche</strong></span>
          <button
            onClick={() => { setMode('recent'); setSearchEnabled(false); }}
            className="text-xs text-[#003189] hover:underline"
          >
            ← Revenir aux récentes
          </button>
        </div>
      )}

      {/* Export CSV */}
      {mode === 'recent' && filteredData && filteredData.results.length > 0 && (
        <div className="mb-4">
          <ExportButton
            params={{
              days: recentParams.days,
              departement: recentParams.departement,
              activitePrincipale: recentParams.activitePrincipale,
              sectionActivite: recentParams.sectionActivite,
              trancheEffectifSalarie: recentParams.trancheEffectifSalarie,
              etatAdministratif: recentParams.etatAdministratif,
            }}
            totalResults={filteredData.pagination.totalResults}
          />
        </div>
      )}

      {/* Liste */}
      <EntreprisesList
        data={filteredData}
        isLoading={currentQuery.isLoading}
        isError={currentQuery.isError}
        onPageChange={handlePageChange}
        onCardClick={setSelectedEntreprise}
      />

      {/* Panneau de détail Pappers (au clic sur une carte) */}
      {selectedEntreprise && (
        <EntrepriseDetailPanel
          entreprise={selectedEntreprise}
          onClose={() => setSelectedEntreprise(null)}
        />
      )}
    </div>
  );
}
