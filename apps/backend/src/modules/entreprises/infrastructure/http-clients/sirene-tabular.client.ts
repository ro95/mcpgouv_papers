import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

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

  private readonly datagouvApi: AxiosInstance;
  private readonly tabularApi: AxiosInstance;

  private cachedResourceId: string | null = null;

  constructor() {
    this.datagouvApi = axios.create({
      baseURL: 'https://www.data.gouv.fr/api/1',
      timeout: 12_000,
      headers: { Accept: 'application/json', 'User-Agent': 'api-entreprises/1.0' },
    });

    this.tabularApi = axios.create({
      baseURL: 'https://tabular-api.data.gouv.fr',
      timeout: 20_000,
      headers: { Accept: 'application/json' },
    });
  }

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

    const response = await this.tabularApi.get<TabularApiResponse>(
      `/api/resources/${resourceId}/data/`,
      {
        params: {
          dateCreationUniteLegale__gte: dateMin,
          dateCreationUniteLegale__lte: dateMax,
          etatAdministratifUniteLegale: 'A',
          page,
          page_size: pageSize,
          // Note : order_by n'est pas supporté par l'API tabulaire data.gouv.fr
        },
      },
    );

    if (!response.data?.data) {
      throw new Error(
        `API tabulaire: réponse inattendue (resource=${resourceId})`,
      );
    }

    return response.data;
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
    const { data } = await this.datagouvApi.get<DatagouvDataset>(
      `/datasets/${slug}/`,
    );

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
    await this.tabularApi.head(`/api/resources/${csvResource.id}/data/`);

    this.logger.log(
      `Resource SIRENE trouvée : ${csvResource.id} (${csvResource.title}) dans "${slug}"`,
    );
    return csvResource.id;
  }
}
