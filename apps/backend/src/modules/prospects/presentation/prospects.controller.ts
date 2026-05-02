import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProspectsService } from '../application/prospects.service';
import { EntreprisesService } from '../../entreprises/application/entreprises.service';
import { NouveauxEntrantsQueryDto } from '../application/dto/nouveaux-entrants.query.dto';
import {
  PaginatedProspectsDto,
  ProspectDto,
  WebsiteSignalsDto,
} from '../application/dto/prospect.response.dto';
import { Prospect } from '../domain/prospect.entity';

@ApiTags('Prospects')
@Controller('prospects')
export class ProspectsController {
  constructor(
    private readonly service: ProspectsService,
    private readonly entreprisesService: EntreprisesService,
  ) {}

  @Get('nouveaux-entrants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nouveaux entrants scorés',
    description:
      'Entreprises créées dans la fenêtre [ageMinDays, ageMaxDays] avec scoring + probe HTTP.',
  })
  @ApiResponse({ status: 200, type: PaginatedProspectsDto })
  async nouveauxEntrants(
    @Query() query: NouveauxEntrantsQueryDto,
  ): Promise<PaginatedProspectsDto> {
    const result = await this.service.findNouveauxEntrants(query);
    return {
      results: result.results.map((p) => this.toDto(p)),
      totalScanned: result.totalScanned,
      totalAfterFilter: result.totalAfterFilter,
      page: result.page,
      perPage: result.perPage,
    };
  }

  @Get('website-audit/:siren')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Audit site web (probe + Lighthouse)',
    description:
      "Sonde le site web d'une entreprise (deviné depuis son nom) et calcule un score d'obsolescence.",
  })
  @ApiParam({ name: 'siren', example: '356000000' })
  @ApiResponse({ status: 200, type: WebsiteSignalsDto })
  async auditWebsite(@Param('siren') siren: string): Promise<WebsiteSignalsDto> {
    const entreprise = await this.entreprisesService.findBySiren(siren);
    return this.service.auditWebsite(entreprise.nomRaisonSociale);
  }

  private toDto(p: Prospect): ProspectDto {
    return {
      entreprise: {
        siren: p.entreprise.siren,
        nomRaisonSociale: p.entreprise.nomRaisonSociale,
        dateCreation: p.entreprise.dateCreation,
        activitePrincipale: p.entreprise.activitePrincipale,
        libelleActivitePrincipale: p.entreprise.libelleActivitePrincipale,
        categorieEntreprise: p.entreprise.categorieEntreprise,
        etatAdministratif: p.entreprise.etatAdministratif,
        siege: p.entreprise.siege,
        nombreEtablissements: p.entreprise.nombreEtablissements,
        nombreEtablissementsOuverts: p.entreprise.nombreEtablissementsOuverts,
        trancheEffectifSalarie: p.entreprise.trancheEffectifSalarie,
        dateImmatriculation: p.entreprise.dateImmatriculation,
        ancienneteJours: p.entreprise.ancienneteJours,
        dirigeants: p.entreprise.dirigeants,
      },
      score: p.score,
      website: p.website,
    };
  }
}
