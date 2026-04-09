import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EntreprisesService } from '../application/entreprises.service';
import {
  SearchEntreprisesQueryDto,
  RecentEntreprisesQueryDto,
} from '../application/dto/search-entreprises.query.dto';
import { ExportEntreprisesQueryDto } from '../application/dto/export-entreprises.query.dto';
import {
  PaginatedEntreprisesResponseDto,
  EntrepriseDto,
} from '../application/dto/paginated-entreprises.response.dto';
import { EnrichmentResponseDto } from '../application/dto/enrichment.response.dto';
import { Entreprise, PaginatedEntreprises } from '../domain/entreprise.entity';

/**
 * Contrôleur REST — couche de présentation uniquement.
 * Ne contient aucune logique métier (Single Responsibility).
 */
@ApiTags('Entreprises')
@Controller('entreprises')
export class EntreprisesController {
  constructor(private readonly service: EntreprisesService) {}

  // ─────────────────────────────────────────────
  // GET /entreprises/recentes
  // ─────────────────────────────────────────────

  @Get('recentes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Récentes ouvertures d\'entreprises',
    description:
      'Retourne les entreprises créées dans les N derniers jours, triées du plus récent au plus ancien.',
  })
  @ApiResponse({ status: 200, type: PaginatedEntreprisesResponseDto })
  async getRecentes(
    @Query() query: RecentEntreprisesQueryDto,
  ): Promise<PaginatedEntreprisesResponseDto> {
    const result = await this.service.findRecent(query);
    return this.toPaginatedResponse(result);
  }

  // ─────────────────────────────────────────────
  // GET /entreprises/search
  // ─────────────────────────────────────────────

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recherche d\'entreprises avec filtres',
    description:
      'Recherche full-text et filtrée sur la base SIRENE via data.gouv.fr.',
  })
  @ApiResponse({ status: 200, type: PaginatedEntreprisesResponseDto })
  async search(
    @Query() query: SearchEntreprisesQueryDto,
  ): Promise<PaginatedEntreprisesResponseDto> {
    const result = await this.service.search(query);
    return this.toPaginatedResponse(result);
  }

  // ─────────────────────────────────────────────
  // GET /entreprises/stats
  // ─────────────────────────────────────────────

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Statistiques de création d\'entreprises',
    description: 'Nombre de créations sur les N derniers jours.',
  })
  async getStats(
    @Query('days') days?: string,
  ): Promise<{
    totalRecentCreations: number;
    periodDays: number;
    dateMin: string;
    dateMax: string;
  }> {
    return this.service.getStats(days ? parseInt(days, 10) : 30);
  }

  // ─────────────────────────────────────────────
  // GET /entreprises/export
  // Export CSV des entreprises filtrées (avec email)
  // ─────────────────────────────────────────────

  @Get('export')
  @ApiOperation({
    summary: 'Export CSV des entreprises filtrées',
    description:
      'Récupère les entreprises selon les filtres, enrichit via Pappers, ' +
      'et retourne un CSV contenant uniquement celles avec un email. Max 50.',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Fichier CSV' })
  async exportCsv(
    @Query() query: ExportEntreprisesQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.service.exportCsv(query);

    const date = new Date().toISOString().split('T')[0];
    const filename = `entreprises-export-${date}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM UTF-8 pour Excel
    res.send('\uFEFF' + csv);
  }

  // ─────────────────────────────────────────────
  // GET /entreprises/:siren/enrichment
  // Données Pappers : site web, email, téléphone, CA
  // ─────────────────────────────────────────────

  @Get(':siren/enrichment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enrichissement Pappers d\'une entreprise',
    description:
      'Retourne les données de contact (site web, email, téléphone) et financières (CA, résultat) ' +
      'via l\'API Pappers. Nécessite PAPPERS_API_KEY dans .env.',
  })
  @ApiParam({
    name: 'siren',
    description: 'Numéro SIREN à 9 chiffres',
    example: '356000000',
  })
  @ApiResponse({ status: 200, type: EnrichmentResponseDto })
  async enrichBySiren(
    @Param('siren') siren: string,
  ): Promise<EnrichmentResponseDto> {
    return this.service.enrich(siren);
  }

  // ─────────────────────────────────────────────
  // GET /entreprises/:siren
  // ─────────────────────────────────────────────

  @Get(':siren')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Détail d\'une entreprise par SIREN' })
  @ApiParam({
    name: 'siren',
    description: 'Numéro SIREN à 9 chiffres',
    example: '356000000',
  })
  @ApiResponse({ status: 200, type: EntrepriseDto })
  @ApiResponse({ status: 404, description: 'Entreprise introuvable' })
  async findBySiren(@Param('siren') siren: string): Promise<EntrepriseDto> {
    const entreprise = await this.service.findBySiren(siren);
    return this.toDto(entreprise);
  }

  // ─────────────────────────────────────────────
  // Helpers de mapping vers DTO de présentation
  // ─────────────────────────────────────────────

  private toPaginatedResponse(
    paginated: PaginatedEntreprises,
  ): PaginatedEntreprisesResponseDto {
    return {
      results: paginated.results.map((e) => this.toDto(e)),
      pagination: {
        totalResults: paginated.totalResults,
        page: paginated.page,
        perPage: paginated.perPage,
        totalPages: paginated.totalPages,
      },
    };
  }

  private toDto(e: Entreprise): EntrepriseDto {
    return {
      siren: e.siren,
      nomRaisonSociale: e.nomRaisonSociale,
      dateCreation: e.dateCreation,
      activitePrincipale: e.activitePrincipale,
      libelleActivitePrincipale: e.libelleActivitePrincipale,
      categorieEntreprise: e.categorieEntreprise,
      etatAdministratif: e.etatAdministratif,
      siege: e.siege,
      nombreEtablissements: e.nombreEtablissements,
      nombreEtablissementsOuverts: e.nombreEtablissementsOuverts,
      trancheEffectifSalarie: e.trancheEffectifSalarie,
      dateImmatriculation: e.dateImmatriculation,
      ancienneteJours: e.ancienneteJours,
      dirigeants: e.dirigeants, // ← exposé dans la réponse API
    };
  }
}
