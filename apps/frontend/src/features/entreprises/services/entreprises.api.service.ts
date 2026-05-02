import {
  ApiEnvelopeSchema,
  EntrepriseSchema,
  EnrichmentSchema,
  EntreprisesStatsSchema,
  PaginatedEntreprisesSchema,
  type Entreprise,
  type Enrichment,
  type EntreprisesStats,
  type PaginatedEntreprises,
  type SearchEntreprisesParams,
  type RecentEntreprisesParams,
} from '@mcpgouv/shared-types';

export type { SearchEntreprisesParams, RecentEntreprisesParams };

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const DEFAULT_TIMEOUT = 15_000;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Construit une URL avec query params (ignore les valeurs undefined) */
function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** GET JSON avec timeout via AbortSignal */
async function fetchJson<T>(
  path: string,
  opts?: { params?: Record<string, unknown>; timeout?: number },
): Promise<T> {
  const url = buildUrl(path, opts?.params);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(opts?.timeout ?? DEFAULT_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/** Parse + valide avec Zod — lance une erreur lisible si la réponse ne correspond pas au schéma */
function parseResponse<T>(
  raw: unknown,
  dataSchema: Parameters<typeof ApiEnvelopeSchema>[0],
): T {
  const envelopeSchema = ApiEnvelopeSchema(dataSchema);
  const result = envelopeSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')} — ${i.message}`)
      .join(' | ');
    console.error('[Zod] Réponse API invalide :', issues);
    throw new Error(`Réponse API invalide : ${issues}`);
  }

  return result.data.data as T;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

/**
 * Service API côté frontend.
 * Chaque méthode :
 *  1. Appelle le backend NestJS
 *  2. Valide la réponse avec Zod (détecte tout drift entre back et front)
 *  3. Retourne un type TypeScript inféré depuis le schéma Zod
 */
const EntreprisesApiService = {
  async getRecentes(params: RecentEntreprisesParams = {}): Promise<PaginatedEntreprises> {
    const raw = await fetchJson('/entreprises/recentes', {
      params: {
        days: params.days ?? 30,
        page: params.page ?? 1,
        perPage: params.perPage ?? 20,
        departement: params.departement,
        activitePrincipale: params.activitePrincipale,
        sectionActivite: params.sectionActivite,
        trancheEffectifSalarie: params.trancheEffectifSalarie,
        etatAdministratif: params.etatAdministratif,
      },
    });
    return parseResponse<PaginatedEntreprises>(raw, PaginatedEntreprisesSchema);
  },

  async search(params: SearchEntreprisesParams): Promise<PaginatedEntreprises> {
    const raw = await fetchJson('/entreprises/search', { params: params as Record<string, unknown> });
    return parseResponse<PaginatedEntreprises>(raw, PaginatedEntreprisesSchema);
  },

  async findBySiren(siren: string): Promise<Entreprise> {
    const raw = await fetchJson(`/entreprises/${siren}`);
    return parseResponse<Entreprise>(raw, EntrepriseSchema);
  },

  async getStats(days = 30): Promise<EntreprisesStats> {
    const raw = await fetchJson('/entreprises/stats', { params: { days } });
    return parseResponse<EntreprisesStats>(raw, EntreprisesStatsSchema);
  },

  async getEnrichment(siren: string): Promise<Enrichment> {
    const raw = await fetchJson(`/entreprises/${siren}/enrichment`);
    return parseResponse<Enrichment>(raw, EnrichmentSchema);
  },

  /**
   * Télécharge un CSV des entreprises filtrées (uniquement celles avec email).
   * Déclenche le téléchargement côté navigateur.
   */
  async exportCsv(params: {
    days?: number;
    limit?: number;
    departement?: string;
    activitePrincipale?: string;
    sectionActivite?: string;
    trancheEffectifSalarie?: string;
    etatAdministratif?: 'A' | 'C';
  }): Promise<void> {
    const url = buildUrl('/entreprises/export', params as Record<string, unknown>);
    const response = await fetch(url, {
      headers: { Accept: 'text/csv' },
      signal: AbortSignal.timeout(120_000), // 2 min — enrichissement en masse
    });

    if (!response.ok) {
      throw new Error(`Export error ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    // Extraire le nom de fichier du header Content-Disposition
    const disposition = response.headers.get('content-disposition');
    const match = disposition?.match(/filename="?(.+?)"?$/);
    link.download = match?.[1] ?? `entreprises-export-${new Date().toISOString().split('T')[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },
} as const;

export default EntreprisesApiService;
