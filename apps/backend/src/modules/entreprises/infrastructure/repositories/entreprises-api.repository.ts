import { Injectable, Logger } from '@nestjs/common';
import {
  IEntreprisesRepository,
  SearchEntreprisesFilters,
} from '../../domain/ports/entreprises.repository.port';
import { Entreprise, PaginatedEntreprises } from '../../domain/entreprise.entity';
import { RechercheEntreprisesClient } from '../http-clients/recherche-entreprises.client';
import { SireneTabularClient } from '../http-clients/sirene-tabular.client';
import { InseeApiClient } from '../http-clients/insee-api.client';
import { EntrepriseApiMapper } from '../mappers/entreprise-api.mapper';
import { SireneTabularMapper } from '../mappers/sirene-tabular.mapper';
import { InseeApiMapper } from '../mappers/insee-api.mapper';

/**
 * Implémentation concrète du port IEntreprisesRepository.
 *
 * Stratégie pour findRecent() — 3 niveaux, premier disponible gagne :
 *  1. API Sirene INSEE (filtrage date réel, nécessite credentials gratuits)
 *  2. API Tabulaire data.gouv.fr  (filtrage date réel, sans credentials)
 *  3. API Recherche d'entreprises (fallback sans filtrage date)
 */
@Injectable()
export class EntreprisesApiRepository implements IEntreprisesRepository {
  private readonly logger = new Logger(EntreprisesApiRepository.name);

  constructor(
    private readonly searchClient: RechercheEntreprisesClient,
    private readonly tabularClient: SireneTabularClient,
    private readonly inseeClient: InseeApiClient,
    private readonly searchMapper: EntrepriseApiMapper,
    private readonly tabularMapper: SireneTabularMapper,
    private readonly inseeMapper: InseeApiMapper,
  ) {}

  // ─────────────────────────────────────────────
  // search() — API Recherche d'entreprises
  // ─────────────────────────────────────────────

  async search(filters: SearchEntreprisesFilters): Promise<PaginatedEntreprises> {
    this.logger.debug(`search() filters=${JSON.stringify(filters)}`);

    const raw = await this.searchClient.search({
      q: filters.query,
      page: filters.page,
      per_page: Math.min(filters.perPage ?? 20, 25),
      code_postal: filters.codePostal,
      departement: filters.departement,
      activite_principale: filters.activitePrincipale,
      etat_administratif: filters.etatAdministratif,
      tranche_effectif_salarie: filters.trancheEffectifSalarie,
    });

    return this.searchMapper.toPaginated(raw);
  }

  // ─────────────────────────────────────────────
  // findRecent() — cascade de sources
  // ─────────────────────────────────────────────

  async findRecent(
    days: number,
    page: number,
    perPage: number,
    filters: { activitePrincipale?: string; departement?: string; trancheEffectifSalarie?: string; etatAdministratif?: 'A' | 'C' } = {},
  ): Promise<PaginatedEntreprises> {
    const today = new Date();
    const dateMin = new Date(today);
    dateMin.setDate(today.getDate() - days);
    const dateMinStr = dateMin.toISOString().split('T')[0];
    const dateMaxStr = today.toISOString().split('T')[0];

    this.logger.debug(
      `findRecent() days=${days}, range=[${dateMinStr}, ${dateMaxStr}], ` +
      `naf=${filters.activitePrincipale ?? '*'}, dept=${filters.departement ?? '*'}`,
    );

    // ── 1. API Sirene INSEE (meilleure source, filtrage date réel) ──
    if (this.inseeClient.isConfigured) {
      try {
        const raw = await this.inseeClient.findRecent(dateMinStr, dateMaxStr, page, perPage);
        this.logger.log(`[findRecent] ✅ Source: API Sirene INSEE (${raw.header.total} résultats)`);
        return this.inseeMapper.toPaginated(raw);
      } catch (err: unknown) {
        this.logger.warn(
          `[findRecent] ⚠️ API Sirene INSEE échouée (${this.errMsg(err)}). Essai source suivante.`,
        );
      }
    } else {
      this.logger.debug(
        '[findRecent] INSEE non configuré (INSEE_CONSUMER_KEY/SECRET absents). Essai API tabulaire.',
      );
    }

    // ── 2. API Tabulaire SIRENE data.gouv.fr (filtrage date réel, sans auth) ──
    try {
      const raw = await this.tabularClient.findRecent(dateMinStr, dateMaxStr, page, perPage);
      this.logger.log(`[findRecent] ✅ Source: API Tabulaire data.gouv.fr`);
      return this.tabularMapper.toPaginated(raw);
    } catch (err: unknown) {
      this.logger.warn(
        `[findRecent] ⚠️ API tabulaire indisponible (${this.errMsg(err)}). Fallback API Recherche.`,
      );
    }

    // ── 3. Fallback intelligent : API Recherche + filtrage date côté backend ──
    // Cible les entreprises sans salariés (NN = non-employeur, souvent très récentes)
    // puis filtre les résultats par date_creation côté backend.
    this.logger.warn(
      '[findRecent] ⚠️ Fallback intelligent (filtrage date côté backend). ' +
        'Pour des résultats optimaux, configurez INSEE_API_KEY dans .env.',
    );
    return this.findRecentByClientFilter(dateMinStr, dateMaxStr, page, perPage, filters);
  }

  // ─────────────────────────────────────────────
  // findRecentByClientFilter() — filtrage date côté backend
  // Stratégie : cibler les non-employeurs (souvent récents) + filtrer par date_creation
  // ─────────────────────────────────────────────

  private async findRecentByClientFilter(
    dateMin: string,
    dateMax: string,
    page: number,
    perPage: number,
    filters: { activitePrincipale?: string; sectionActivite?: string; departement?: string; trancheEffectifSalarie?: string; etatAdministratif?: 'A' | 'C' } = {},
  ): Promise<PaginatedEntreprises> {
    const MAX_FETCH_PAGES = 8;
    const accumulated: import('../../domain/entreprise.entity').Entreprise[] = [];
    let fetchPage = 1;
    let totalEstimated = 0;

    while (accumulated.length < page * perPage && fetchPage <= MAX_FETCH_PAGES) {
      const raw = await this.searchClient.search({
        per_page: 25,
        page: fetchPage,
        etat_administratif: filters.etatAdministratif ?? 'A',
        // Si l'utilisateur a choisi une tranche, on l'utilise ; sinon on cible les non-employeurs (souvent récents)
        tranche_effectif_salarie: filters.trancheEffectifSalarie || 'NN',
        // Filtres NAF et département transmis depuis le frontend
        activite_principale: filters.activitePrincipale,
        section_activite_principale: filters.sectionActivite,
        departement: filters.departement,
      });

      if (fetchPage === 1) totalEstimated = raw.total_results;

      const filtered = raw.results
        .map((r) => this.searchMapper.toEntity(r))
        .filter((e) => e.dateCreation >= dateMin && e.dateCreation <= dateMax);

      accumulated.push(...filtered);
      fetchPage++;

      if (raw.results.length < 25) break; // dernière page
    }

    const start = (page - 1) * perPage;
    const pageResults = accumulated.slice(start, start + perPage);

    this.logger.debug(
      `[findRecentByClientFilter] ${accumulated.length} résultats filtrés après ${fetchPage - 1} pages`,
    );

    return {
      results: pageResults,
      totalResults: Math.min(accumulated.length, totalEstimated),
      page,
      perPage,
      totalPages: Math.ceil(accumulated.length / perPage) || 1,
    };
  }

  // ─────────────────────────────────────────────
  // findBySiren() — API Recherche d'entreprises
  // ─────────────────────────────────────────────

  async findBySiren(siren: string): Promise<Entreprise | null> {
    this.logger.debug(`findBySiren() siren=${siren}`);
    const raw = await this.searchClient.findBySiren(siren);
    if (!raw) return null;
    return this.searchMapper.toEntity(raw);
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
