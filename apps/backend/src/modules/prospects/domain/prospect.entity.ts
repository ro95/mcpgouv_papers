import { Entreprise } from '../../entreprises/domain/entreprise.entity';

export interface WebsiteSignals {
  domainTried: string;
  reachable: boolean;
  https: boolean;
  validTls: boolean;
  hasViewport: boolean;
  usesJquery: boolean;
  copyrightYear: number | null;
  serverHeader: string | null;
  finalUrl: string | null;
  performanceScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  obsolescenceScore: number;
  verdict: 'no-site' | 'obsolete' | 'modern' | 'unknown';
}

export interface ProspectScore {
  total: number;
  breakdown: Record<string, number>;
  tier: 'cold' | 'warm' | 'hot';
}

export class Prospect {
  constructor(
    public readonly entreprise: Entreprise,
    public readonly score: ProspectScore,
    public readonly website: WebsiteSignals | null,
  ) {}
}
