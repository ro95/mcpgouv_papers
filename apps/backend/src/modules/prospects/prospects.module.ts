import { Module } from '@nestjs/common';
import { EntreprisesModule } from '../entreprises/entreprises.module';
import { ProspectsController } from './presentation/prospects.controller';
import { ProspectsService } from './application/prospects.service';
import { ScoringService } from './application/scoring.service';
import { WebsiteProbeClient } from './infrastructure/website-probe.client';
import { PageSpeedClient } from './infrastructure/pagespeed.client';

@Module({
  imports: [EntreprisesModule],
  controllers: [ProspectsController],
  providers: [ProspectsService, ScoringService, WebsiteProbeClient, PageSpeedClient],
})
export class ProspectsModule {}
