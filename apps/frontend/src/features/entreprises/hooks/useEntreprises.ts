'use client';

import { useQuery } from '@tanstack/react-query';
import EntreprisesApiService, {
  type RecentEntreprisesParams,
  type SearchEntreprisesParams,
} from '../services/entreprises.api.service';

// ─────────────────────────────────────────────
// Query keys — centralisés pour éviter les doublons
// ─────────────────────────────────────────────
export const entreprisesQueryKeys = {
  all: ['entreprises'] as const,
  recentes: (params: RecentEntreprisesParams) =>
    ['entreprises', 'recentes', params] as const,
  search: (params: SearchEntreprisesParams) =>
    ['entreprises', 'search', params] as const,
  bySiren: (siren: string) => ['entreprises', siren] as const,
  enrichment: (siren: string) => ['entreprises', 'enrichment', siren] as const,
  stats: (days: number) => ['entreprises', 'stats', days] as const,
};

// ─────────────────────────────────────────────
// Hook : entreprises récentes
// ─────────────────────────────────────────────
export function useRecentEntreprises(params: RecentEntreprisesParams = {}) {
  return useQuery({
    queryKey: entreprisesQueryKeys.recentes(params),
    queryFn: () => EntreprisesApiService.getRecentes(params),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

// ─────────────────────────────────────────────
// Hook : recherche d'entreprises
// ─────────────────────────────────────────────
export function useSearchEntreprises(
  params: SearchEntreprisesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: entreprisesQueryKeys.search(params),
    queryFn: () => EntreprisesApiService.search(params),
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// ─────────────────────────────────────────────
// Hook : détail par SIREN
// ─────────────────────────────────────────────
export function useEntrepriseBySiren(siren: string | null) {
  return useQuery({
    queryKey: entreprisesQueryKeys.bySiren(siren ?? ''),
    queryFn: () => EntreprisesApiService.findBySiren(siren!),
    enabled: !!siren,
    staleTime: 10 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────
// Hook : enrichissement Pappers (site web, email, tel, CA)
// Appelé uniquement au clic sur une fiche (économise les tokens)
// ─────────────────────────────────────────────
export function useEnrichment(siren: string | null) {
  return useQuery({
    queryKey: entreprisesQueryKeys.enrichment(siren ?? ''),
    queryFn: () => EntreprisesApiService.getEnrichment(siren!),
    enabled: !!siren,
    staleTime: 30 * 60 * 1000, // 30 min — données peu volatiles
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

// ─────────────────────────────────────────────
// Hook : statistiques
// ─────────────────────────────────────────────
export function useEntreprisesStats(days = 30) {
  return useQuery({
    queryKey: entreprisesQueryKeys.stats(days),
    queryFn: () => EntreprisesApiService.getStats(days),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
