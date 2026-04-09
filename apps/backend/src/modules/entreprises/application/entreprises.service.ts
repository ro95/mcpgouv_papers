import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import {
  IEntreprisesRepository,
  ENTREPRISES_REPOSITORY,
} from '../domain/ports/entreprises.repository.port';
import { Entreprise, PaginatedEntreprises } from '../domain/entreprise.entity';
import {
  SearchEntreprisesQueryDto,
  RecentEntreprisesQueryDto,
} from './dto/search-entreprises.query.dto';
import { ExportEntreprisesQueryDto } from './dto/export-entreprises.query.dto';
import { EnrichmentResponseDto } from './dto/enrichment.response.dto';
import { PappersClient } from '../infrastructure/http-clients/pappers.client';

/**
 * Service applicatif — orchestre la logique métier sans connaître
 * les détails d'infrastructure (Single Responsibility + Dependency Inversion).
 */
/** Ligne CSV d'export enrichie. */
export interface ExportRow {
  nom: string;
  siren: string;
  email: string;
  telephone: string;
  siteWeb: string;
  activite: string;
  ville: string;
}

@Injectable()
export class EntreprisesService {
  private readonly logger = new Logger(EntreprisesService.name);

  constructor(
    @Inject(ENTREPRISES_REPOSITORY)
    private readonly repository: IEntreprisesRepository,
    private readonly pappersClient: PappersClient,
  ) {}

  async search(dto: SearchEntreprisesQueryDto): Promise<PaginatedEntreprises> {
    return this.repository.search({
      query: dto.q,
      page: dto.page,
      perPage: dto.perPage,
      codePostal: dto.codePostal,
      departement: dto.departement,
      activitePrincipale: dto.activitePrincipale,
      dateCreationMin: dto.dateCreationMin,
      dateCreationMax: dto.dateCreationMax,
      etatAdministratif: dto.etatAdministratif,
      trancheEffectifSalarie: dto.trancheEffectifSalarie,
    });
  }

  async findRecent(dto: RecentEntreprisesQueryDto): Promise<PaginatedEntreprises> {
    return this.repository.findRecent(
      dto.days ?? 30,
      dto.page ?? 1,
      dto.perPage ?? 20,
      {
        activitePrincipale: dto.activitePrincipale,
        sectionActivite: dto.sectionActivite,
        departement: dto.departement,
        trancheEffectifSalarie: dto.trancheEffectifSalarie,
        etatAdministratif: dto.etatAdministratif,
      },
    );
  }

  async findBySiren(siren: string): Promise<Entreprise> {
    const entreprise = await this.repository.findBySiren(siren);
    if (!entreprise) {
      throw new NotFoundException(`Entreprise SIREN ${siren} introuvable`);
    }
    return entreprise;
  }

  async getStats(days: number = 30): Promise<{
    totalRecentCreations: number;
    periodDays: number;
    dateMin: string;
    dateMax: string;
  }> {
    const today = new Date();
    const dateMin = new Date(today);
    dateMin.setDate(today.getDate() - days);

    const result = await this.repository.search({
      dateCreationMin: dateMin.toISOString().split('T')[0],
      dateCreationMax: today.toISOString().split('T')[0],
      etatAdministratif: 'A',
      perPage: 1,
    });

    return {
      totalRecentCreations: result.totalResults,
      periodDays: days,
      dateMin: dateMin.toISOString().split('T')[0],
      dateMax: today.toISOString().split('T')[0],
    };
  }

  /**
   * Exporte les entreprises filtrées en CSV.
   * 1. Récupère jusqu'à `limit` entreprises via les filtres
   * 2. Enrichit chaque entreprise via Pappers (concurrence limitée à 5)
   * 3. Ne garde que celles qui ont un email
   * 4. Retourne le CSV en string
   */
  async exportCsv(dto: ExportEntreprisesQueryDto): Promise<string> {
    const limit = dto.limit ?? 50;

    // Récupérer les entreprises filtrées (on prend assez de pages pour atteindre le limit)
    const perPage = Math.min(limit, 25);
    const maxPages = Math.ceil(limit / perPage);
    const allEntreprises: Entreprise[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const result = await this.repository.findRecent(
        dto.days ?? 30,
        page,
        perPage,
        {
          activitePrincipale: dto.activitePrincipale,
          sectionActivite: dto.sectionActivite,
          departement: dto.departement,
          trancheEffectifSalarie: dto.trancheEffectifSalarie,
          etatAdministratif: dto.etatAdministratif,
        },
      );

      allEntreprises.push(...result.results);
      if (allEntreprises.length >= limit || page >= result.totalPages) break;
    }

    // Limiter au nombre demandé
    const entreprises = allEntreprises.slice(0, limit);
    this.logger.log(`[export] ${entreprises.length} entreprises à enrichir`);

    // Enrichir par lots de 5 en parallèle
    const rows: ExportRow[] = [];
    const batchSize = 5;

    for (let i = 0; i < entreprises.length; i += batchSize) {
      const batch = entreprises.slice(i, i + batchSize);
      const enrichments = await Promise.allSettled(
        batch.map(async (e) => {
          if (!this.pappersClient.isConfigured) return null;
          try {
            return await this.pappersClient.getEntreprise(e.siren);
          } catch {
            return null;
          }
        }),
      );

      for (let j = 0; j < batch.length; j++) {
        const enrichResult = enrichments[j];
        const enrichData =
          enrichResult.status === 'fulfilled' ? enrichResult.value : null;
        const email = enrichData?.email;

        // Uniquement les entreprises avec email
        if (email) {
          rows.push({
            nom: batch[j].nomRaisonSociale,
            siren: batch[j].siren,
            email,
            telephone: enrichData?.telephone ?? '',
            siteWeb: enrichData?.site_web ?? '',
            activite: batch[j].libelleActivitePrincipale || batch[j].activitePrincipale,
            ville: batch[j].siege?.libelleCommune ?? '',
          });
        }
      }
    }

    this.logger.log(`[export] ${rows.length} entreprises avec email trouvées`);

    // Générer le CSV
    const headers = ['Nom', 'SIREN', 'Email', 'Téléphone', 'Site web', 'Activité', 'Ville'];
    const csvLines = [
      headers.join(';'),
      ...rows.map((r) =>
        [r.nom, r.siren, r.email, r.telephone, r.siteWeb, r.activite, r.ville]
          .map((v) => `"${(v ?? '').replace(/"/g, '""')}"`)
          .join(';'),
      ),
    ];

    return csvLines.join('\n');
  }

  /**
   * Enrichit une entreprise via l'API Pappers (site web, email, téléphone, CA).
   * Retourne un objet avec disponible=false si Pappers n'est pas configuré.
   */
  async enrich(siren: string): Promise<EnrichmentResponseDto> {
    const emptyResult = (erreur?: string): EnrichmentResponseDto => ({
      siren,
      siteWeb: null,
      email: null,
      telephone: null,
      chiffreAffaires: null,
      resultat: null,
      effectifs: null,
      source: 'pappers',
      disponible: false,
      erreur: erreur ?? null,
    });

    if (!this.pappersClient.isConfigured) {
      return emptyResult('Clé API Pappers non configurée — ajoutez PAPPERS_API_KEY dans .env');
    }

    try {
      const data = await this.pappersClient.getEntreprise(siren);
      if (!data) {
        return emptyResult('Aucune donnée retournée par Pappers pour ce SIREN');
      }

      return {
        siren: data.siren,
        siteWeb: data.site_web ?? null,
        email: data.email ?? null,
        telephone: data.telephone ?? null,
        chiffreAffaires: data.chiffre_affaires ?? null,
        resultat: data.resultat ?? null,
        effectifs: data.effectifs ?? null,
        source: 'pappers',
        disponible: true,
        erreur: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return emptyResult(msg);
    }
  }
}
