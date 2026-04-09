'use client';

import { AlertCircle, Building2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { EntrepriseCard } from './EntrepriseCard';
import type { PaginatedEntreprises, Entreprise } from '../types/entreprise.types';

interface EntreprisesListProps {
  data: PaginatedEntreprises | undefined;
  isLoading: boolean;
  isError: boolean;
  onPageChange: (page: number) => void;
  onCardClick?: (entreprise: Entreprise) => void;
}

export function EntreprisesList({
  data,
  isLoading,
  isError,
  onPageChange,
  onCardClick,
}: EntreprisesListProps) {
  // ── Chargement ────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
          >
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Erreur ────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">
          Erreur de chargement
        </h3>
        <p className="text-sm text-gray-500">
          Impossible de récupérer les données. Vérifiez que le backend est démarré.
        </p>
      </div>
    );
  }

  // ── Vide ──────────────────────────────────────
  if (!data || data.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-500">
          Aucune entreprise trouvée
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Essayez de modifier les filtres ou d&apos;élargir la période.
        </p>
      </div>
    );
  }

  const { results, pagination } = data;

  return (
    <div>
      {/* Compteur */}
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-medium text-gray-800">
          {pagination.totalResults.toLocaleString('fr-FR')}
        </span>{' '}
        entreprise{pagination.totalResults > 1 ? 's' : ''} trouvée
        {pagination.totalResults > 1 ? 's' : ''}
        {pagination.totalPages > 1 && (
          <span>
            {' '}— page {pagination.page}/{pagination.totalPages}
          </span>
        )}
      </p>

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {results.map((e) => (
          <EntrepriseCard
            key={e.siren}
            entreprise={e}
            onClick={onCardClick}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sous-composant Pagination
// ─────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const pages = buildPageRange(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Page précédente"
      >
        <ChevronLeft size={18} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-[#003189] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Page suivante"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
