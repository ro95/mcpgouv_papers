import { Injectable, Logger } from '@nestjs/common';

// ─────────────────────────────────────────────
// Types bruts renvoyés par l'API tabulaire
// ─────────────────────────────────────────────

export interface RawSireneUniteLegale {
  siren: string;
  denominationUniteLegale: string | null;
  denominationUsuelle1UniteLegale: string | null;
  nomUniteLegale: string | null;
  prenomUsuelUniteLegale: string | null;
  dateCreationUniteLegale: string;
  activitePrincipaleUniteLegale: string;
  categorieEntrepriseUniteLegale: string | null;
  etatAdministratifUniteLegale: 'A' | 'C';
  trancheEffectifsUniteLegale: string | null;
  categorieJuridiqueUniteLegale: string | null;
  nicsiegeUniteLegale: string | null;
}

export interface TabularApiResponse {
  data: RawSireneUniteLegale[];
  meta: { total: number; page: number; page_size: number };
}

interface DatagouvResource {
  id: string;
  title: string;
  url: string;
  format: string;
  extras?: Record<string, unknown>;
}

interface DatagouvDataset {
  resources: DatagouvResource[];
}

interface DatagouvSearchResult {
  data: Array<{ id: string; slug: string; title: string; resources: DatagouvResource[] }>;
}

// ─────────────────────────────────────────────
// Datasets candidats, par ordre de préférence.
// Le premier qui répond correctement à l'API tabulaire est utilisé.
// ─────────────────────────────────────────────

const CANDIDATE_DATASETS = [
  // ESS (Économie Sociale et Solidaire) — petit sous-ensemble SIRENE, souvent indexé
  'economie-sociale-et-solidaire-base-sirene',
  // Dataset principal SIRENE (probablement trop grand pour la tabular API)
  'base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret',
];

@Injectable()
export class SireneTabularClient {
  private readonly logger = new Logger(SireneTabularClient.name);

  private readonly datagouvBaseUrl = 'https://www.data.gouv.fr/api/1';
  private readonly tabularBaseUrl = 'https://tabular-api.data.gouv.fr';

  private cachedResourceId: string | null = null;

  // ─────────────────────────────────────────────
  // API publique
  // ─────────────────────────────────────────────

  async findRecent(
    dateMin: string,
    dateMax: string,
    page: number,
    pageSize: number,
  ): Promise<TabularApiResponse> {
    const resourceId = await this.resolveResourceId();

    this.logger.debug(
      `[findRecent] resource=${resourceId} range=[${dateMin}, ${dateMax}] page=${page}`,
    );

    const params = new URLSearchParams({
      dateCreationUniteLegale__gte: dateMin,
      dateCreationUniteLegale__lte: dateMax,
      etatAdministratifUniteLegale: 'A',
      page: String(page),
      page_size: String(pageSize),
    });
    const response = await this.tabularFetch<TabularApiResponse>(
      `/api/resources/${resourceId}/data/?${params}`,
    );

    if (!response?.data) {
      throw new Error(
        `API tabulaire: réponse inattendue (resource=${resourceId})`,
      );
    }

    return response;
  }

  // ─────────────────────────────────────────────
  // Résolution du resource_id — cherche parmi plusieurs datasets candidats
  // le premier dont une ressource CSV est accessible via l'API tabulaire
  // ─────────────────────────────────────────────

  private async resolveResourceId(): Promise<string> {
    if (this.cachedResourceId) return this.cachedResourceId;

    this.logger.log('Résolution resource_id SIRENE via API tabulaire…');

    for (const slug of CANDIDATE_DATASETS) {
      try {
        const resourceId = await this.tryResolveFromDataset(slug);
        if (resourceId) {
          this.cachedResourceId = resourceId;
          return resourceId;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`[resolveResourceId] dataset=${slug} → ${msg}`);
      }
    }

    throw new Error(
      'Aucun dataset SIRENE disponible via l\'API tabulaire. ' +
        `Datasets testés: ${CANDIDATE_DATASETS.join(', ')}`,
    );
  }

  private async tryResolveFromDataset(slug: string): Promise<string | null> {
    const data = await this.datagouvFetch<DatagouvDataset>(`/datasets/${slug}/`);

    const resources = data.resources ?? [];

    // Chercher le fichier de données SIRENE (pas les fichiers de doc/variables)
    // Exclure les fichiers de documentation : "variables", "dessin", "notice", "doc"
    const isDataFile = (r: DatagouvResource) =>
      ['csv', 'tsv'].includes((r.format ?? '').toLowerCase()) &&
      !r.title?.toLowerCase().match(/variables|dessin|notice|documentation|readme/);

    const csvResource =
      // Priorité : fichier avec "stock" dans le titre (données principales)
      resources.find((r) => isDataFile(r) && r.title?.toLowerCase().includes('stock')) ??
      // Sinon : premier CSV non documentaire
      resources.find((r) => isDataFile(r));

    if (!csvResource) {
      this.logger.debug(`[tryResolve] ${slug} : aucune ressource CSV trouvée`);
      return null;
    }

    // Vérifier que l'API tabulaire expose bien cette ressource
    const headRes = await fetch(
      `${this.tabularBaseUrl}/api/resources/${csvResource.id}/data/`,
      { method: 'HEAD', signal: AbortSignal.timeout(12_000) },
    );
    if (!headRes.ok) return null;

    this.logger.log(
      `Resource SIRENE trouvée : ${csvResource.id} (${csvResource.title}) dans "${slug}"`,
    );
    return csvResource.id;
  }

  private async datagouvFetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.datagouvBaseUrl}${path}`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'application/json', 'User-Agent': 'api-entreprises/1.0' },
    });
    if (!response.ok) throw new Error(`data.gouv HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }

  private async tabularFetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.tabularBaseUrl}${path}`, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Tabular API HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }
}
