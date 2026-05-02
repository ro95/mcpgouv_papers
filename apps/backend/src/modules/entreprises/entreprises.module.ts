import { Module } from '@nestjs/common';

import { EntreprisesController } from './presentation/entreprises.controller';
import { EntreprisesService } from './application/entreprises.service';

import { ENTREPRISES_REPOSITORY } from './domain/ports/entreprises.repository.port';
import { EntreprisesApiRepository } from './infrastructure/repositories/entreprises-api.repository';
import { RechercheEntreprisesClient } from './infrastructure/http-clients/recherche-entreprises.client';
import { SireneTabularClient } from './infrastructure/http-clients/sirene-tabular.client';
import { InseeApiClient } from './infrastructure/http-clients/insee-api.client';
import { DatagouvMcpClient } from './infrastructure/http-clients/datagouv-mcp.client';
import { PappersClient } from './infrastructure/http-clients/pappers.client';
import { EntrepriseApiMapper } from './infrastructure/mappers/entreprise-api.mapper';
import { SireneTabularMapper } from './infrastructure/mappers/sirene-tabular.mapper';
import { InseeApiMapper } from './infrastructure/mappers/insee-api.mapper';

/**
 * Module Feature Entreprises.
 *
 * Principe D de SOLID appliqué via le token ENTREPRISES_REPOSITORY :
 * le service dépend de l'interface, NestJS injecte l'implémentation concrète.
 */
@Module({
  controllers: [EntreprisesController],
  providers: [
    // Application
    EntreprisesService,

    // Infrastructure — clients HTTP
    RechercheEntreprisesClient,
    SireneTabularClient,
    InseeApiClient,
    DatagouvMcpClient,
    PappersClient,

    // Mappers
    EntrepriseApiMapper,
    SireneTabularMapper,
    InseeApiMapper,

    // Liaison port ↔ implémentation (Dependency Inversion)
    {
      provide: ENTREPRISES_REPOSITORY,
      useClass: EntreprisesApiRepository,
    },
  ],
  exports: [EntreprisesService],
})
export class EntreprisesModule {}
