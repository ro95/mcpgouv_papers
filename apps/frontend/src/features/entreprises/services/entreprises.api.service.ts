import axios from 'axios';
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
// Client axios
// ─────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  headers: { Accept: 'application/json' },
  timeout: 15_000,
});

// ─────────────────────────────────────────────
// Helper : parse + valide avec Zod
// Lance une erreur lisible si la réponse ne correspond pas au schéma
// ─────────────────────────────────────────────

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
    const { data: raw } = await apiClient.get('/entreprises/recentes', {
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
    const { data: raw } = await apiClient.get('/entreprises/search', { params });
    return parseResponse<PaginatedEntreprises>(raw, PaginatedEntreprisesSchema);
  },

  async findBySiren(siren: string): Promise<Entreprise> {
    const { data: raw } = await apiClient.get(`/entreprises/${siren}`);
    return parseResponse<Entreprise>(raw, EntrepriseSchema);
  },

  async getStats(days = 30): Promise<EntreprisesStats> {
    const { data: raw } = await apiClient.get('/entreprises/stats', {
      params: { days },
    });
    return parseResponse<EntreprisesStats>(raw, EntreprisesStatsSchema);
  },

  async getEnrichment(siren: string): Promise<Enrichment> {
    const { data: raw } = await apiClient.get(`/entreprises/${siren}/enrichment`);
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
    const response = await apiClient.get('/entreprises/export', {
      params,
      responseType: 'blob',
      timeout: 120_000, // 2 min — enrichissement en masse
    });

    // Déclencher le téléchargement
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extraire le nom de fichier du header Content-Disposition
    const disposition = response.headers['content-disposition'];
    const match = disposition?.match(/filename="?(.+?)"?$/);
    link.download = match?.[1] ?? `entreprises-export-${new Date().toISOString().split('T')[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
} as const;

export default EntreprisesApiService;
