import { Injectable, Logger } from '@nestjs/common';
import { EntreprisesService } from '../../entreprises/application/entreprises.service';
import { Entreprise } from '../../entreprises/domain/entreprise.entity';
import { Prospect, WebsiteSignals } from '../domain/prospect.entity';
import { ScoringService } from './scoring.service';
import { WebsiteProbeClient } from '../infrastructure/website-probe.client';
import { PageSpeedClient } from '../infrastructure/pagespeed.client';
import { NouveauxEntrantsQueryDto } from './dto/nouveaux-entrants.query.dto';

interface NouveauxEntrantsResult {
  results: Prospect[];
  totalScanned: number;
  totalAfterFilter: number;
  page: number;
  perPage: number;
}

@Injectable()
export class ProspectsService {
  private readonly logger = new Logger(ProspectsService.name);
  private readonly PROBE_CONCURRENCY = 8;
  private readonly LIGHTHOUSE_CONCURRENCY = 2;

  constructor(
    private readonly entreprisesService: EntreprisesService,
    private readonly scoring: ScoringService,
    private readonly probe: WebsiteProbeClient,
    private readonly pagespeed: PageSpeedClient,
  ) {}

  async findNouveauxEntrants(dto: NouveauxEntrantsQueryDto): Promise<NouveauxEntrantsResult> {
    const ageMin = dto.ageMinDays ?? 90;
    const ageMax = dto.ageMaxDays ?? 270;
    const page = dto.page ?? 1;
    const perPage = dto.perPage ?? 20;
    const minScore = dto.minScore ?? 0;

    if (ageMin >= ageMax) {
      throw new Error('ageMinDays doit être < ageMaxDays');
    }

    const fetched = await this.entreprisesService.findRecent({
      days: ageMax,
      page: 1,
      perPage: 100,
      departement: dto.departement,
      activitePrincipale: dto.activitePrincipale,
      sectionActivite: dto.sectionActivite,
      etatAdministratif: 'A',
    });

    const inWindow = fetched.results.filter(
      (e) => e.ancienneteJours >= ageMin && e.ancienneteJours <= ageMax,
    );
    this.logger.log(
      `[nouveaux-entrants] ${inWindow.length}/${fetched.results.length} dans la fenêtre [${ageMin}, ${ageMax}] jours`,
    );

    const websites = dto.probeWebsite
      ? await this.probeAll(inWindow)
      : new Map<string, WebsiteSignals | null>();

    if (dto.runLighthouse && dto.probeWebsite) {
      await this.runLighthouseOnReachable(websites);
    }

    const scored = inWindow.map((e) => {
      const website = websites.get(e.siren) ?? null;
      const score = this.scoring.score(e, website);
      return new Prospect(e, score, website);
    });

    const filtered = scored
      .filter((p) => p.score.total >= minScore)
      .sort((a, b) => b.score.total - a.score.total);

    const start = (page - 1) * perPage;
    return {
      results: filtered.slice(start, start + perPage),
      totalScanned: fetched.results.length,
      totalAfterFilter: filtered.length,
      page,
      perPage,
    };
  }

  async auditWebsite(nom: string, siteWeb?: string | null): Promise<WebsiteSignals> {
    const signals = await this.probe.probeFromName(nom, siteWeb);
    if (signals.reachable && signals.finalUrl) {
      const scores = await this.pagespeed.getScores(signals.finalUrl);
      if (scores) {
        signals.performanceScore = scores.performance;
        signals.seoScore = scores.seo;
        signals.bestPracticesScore = scores.bestPractices;
        if (scores.performance !== null && scores.performance < 50) {
          signals.obsolescenceScore += 3;
          if (signals.verdict === 'modern') signals.verdict = 'obsolete';
        }
      }
    }
    return signals;
  }

  private async probeAll(entreprises: Entreprise[]): Promise<Map<string, WebsiteSignals | null>> {
    const out = new Map<string, WebsiteSignals | null>();
    for (let i = 0; i < entreprises.length; i += this.PROBE_CONCURRENCY) {
      const batch = entreprises.slice(i, i + this.PROBE_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((e) => this.probe.probeFromName(e.nomRaisonSociale)),
      );
      batch.forEach((e, idx) => {
        const r = settled[idx];
        out.set(e.siren, r.status === 'fulfilled' ? r.value : null);
      });
    }
    return out;
  }

  private async runLighthouseOnReachable(
    websites: Map<string, WebsiteSignals | null>,
  ): Promise<void> {
    const entries = [...websites.entries()].filter(
      ([, s]) => s?.reachable && s.finalUrl,
    );
    for (let i = 0; i < entries.length; i += this.LIGHTHOUSE_CONCURRENCY) {
      const batch = entries.slice(i, i + this.LIGHTHOUSE_CONCURRENCY);
      await Promise.all(
        batch.map(async ([siren, signals]) => {
          if (!signals?.finalUrl) return;
          const scores = await this.pagespeed.getScores(signals.finalUrl);
          if (!scores) return;
          signals.performanceScore = scores.performance;
          signals.seoScore = scores.seo;
          signals.bestPracticesScore = scores.bestPractices;
          if (scores.performance !== null && scores.performance < 50) {
            signals.obsolescenceScore += 3;
            if (signals.verdict === 'modern') signals.verdict = 'obsolete';
          }
          websites.set(siren, signals);
        }),
      );
    }
  }
}
