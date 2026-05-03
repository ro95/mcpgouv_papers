import { Injectable, Logger } from '@nestjs/common';
import { Entreprise } from '../../entreprises/domain/entreprise.entity';
import { InseeApiClient } from '../../entreprises/infrastructure/http-clients/insee-api.client';
import { InseeApiMapper } from '../../entreprises/infrastructure/mappers/insee-api.mapper';
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

const SECTION_NAF_PREFIXES: Record<string, string[]> = {
  A: ['01', '02', '03'],
  B: ['05', '06', '07', '08', '09'],
  C: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
  D: ['35'],
  E: ['36', '37', '38', '39'],
  F: ['41', '42', '43'],
  G: ['45', '46', '47'],
  H: ['49', '50', '51', '52', '53'],
  I: ['55', '56'],
  J: ['58', '59', '60', '61', '62', '63'],
  K: ['64', '65', '66'],
  L: ['68'],
  M: ['69', '70', '71', '72', '73', '74', '75'],
  N: ['77', '78', '79', '80', '81', '82'],
  O: ['84'],
  P: ['85'],
  Q: ['86', '87', '88'],
  R: ['90', '91', '92', '93'],
  S: ['94', '95', '96'],
  T: ['97', '98'],
  U: ['99'],
};

@Injectable()
export class ProspectsService {
  private readonly logger = new Logger(ProspectsService.name);
  private readonly PROBE_CONCURRENCY = 8;
  private readonly LIGHTHOUSE_CONCURRENCY = 2;
  private readonly INSEE_PAGE_SIZE = 200;
  private readonly MAX_PER_SECTION = 80;

  constructor(
    private readonly inseeClient: InseeApiClient,
    private readonly inseeMapper: InseeApiMapper,
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

    const today = new Date();
    const dateMin = new Date(today.getTime() - ageMax * 86_400_000)
      .toISOString()
      .split('T')[0];
    const dateMax = new Date(today.getTime() - ageMin * 86_400_000)
      .toISOString()
      .split('T')[0];

    const fetched = await this.fetchInDateRange(dateMin, dateMax, dto);
    const inWindow = fetched;

    this.logger.log(
      `[nouveaux-entrants] ${inWindow.length} entreprises dans la fenêtre [${dateMin}, ${dateMax}]` +
        ` (section=${dto.sectionActivite ?? '*'}, dept=${dto.departement ?? '*'})`,
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
      totalScanned: fetched.length,
      totalAfterFilter: filtered.length,
      page,
      perPage,
    };
  }

  /**
   * Récupère les nouveaux entrants en fenêtre de date depuis INSEE.
   *
   * Note : recherche-entreprises.api.gouv.fr n'indexe pas les SIRENs récents
   * (lag de 6+ mois). Donc pas d'enrichissement siege/dirigeants possible.
   * On retourne ce que INSEE expose : SIREN, nom, date, NAF.
   * Le filtre département n'est pas appliqué (nécessiterait une requête /siret par SIREN).
   */
  private async fetchInDateRange(
    dateMin: string,
    dateMax: string,
    dto: NouveauxEntrantsQueryDto,
  ): Promise<Entreprise[]> {
    if (!this.inseeClient.isConfigured) {
      throw new Error('INSEE_API_KEY manquant — requis pour le filtrage date.');
    }

    const insee = await this.inseeClient.findRecent(dateMin, dateMax, 1, this.INSEE_PAGE_SIZE);
    const totalInsee = insee.unitesLegales?.length ?? 0;
    this.logger.log(`[insee] ${totalInsee} SIRENs en fenêtre [${dateMin}, ${dateMax}]`);

    const nafPrefixes = dto.sectionActivite
      ? SECTION_NAF_PREFIXES[dto.sectionActivite.toUpperCase()] ?? []
      : [];
    const nafFilter = dto.activitePrincipale ?? null;

    const filtered = (insee.unitesLegales ?? [])
      .map((u) => this.inseeMapper.toEntity(u))
      .filter((e) => {
        if (nafFilter && e.activitePrincipale !== nafFilter) return false;
        if (nafPrefixes.length > 0 && !nafPrefixes.some((p) => e.activitePrincipale.startsWith(p))) return false;
        return true;
      })
      .slice(0, this.MAX_PER_SECTION);

    this.logger.log(
      `[filter-naf] ${filtered.length} entreprises après filtre section ${dto.sectionActivite ?? '*'}` +
        (dto.departement ? ' (note: filtre département non appliqué — requiert /siret)' : ''),
    );

    return filtered;
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
