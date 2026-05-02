import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PageSpeedScores {
  performance: number | null;
  seo: number | null;
  bestPractices: number | null;
}

interface PageSpeedRaw {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number | null };
      seo?: { score: number | null };
      'best-practices'?: { score: number | null };
    };
  };
}

/**
 * Lighthouse via Google PageSpeed Insights API.
 * Sans clé : ~25 req/jour. Avec clé : 25 000 req/jour.
 */
@Injectable()
export class PageSpeedClient {
  private readonly logger = new Logger(PageSpeedClient.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('pagespeed.apiKey') ?? '';
  }

  async getScores(url: string): Promise<PageSpeedScores | null> {
    const params = new URLSearchParams({
      url,
      strategy: 'mobile',
      category: 'performance',
    });
    params.append('category', 'seo');
    params.append('category', 'best-practices');
    if (this.apiKey) params.set('key', this.apiKey);

    try {
      const res = await fetch(`${this.baseUrl}?${params}`, {
        signal: AbortSignal.timeout(40_000),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`PageSpeed ${url} → HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as PageSpeedRaw;
      const cats = data.lighthouseResult?.categories;
      return {
        performance: this.toPercent(cats?.performance?.score),
        seo: this.toPercent(cats?.seo?.score),
        bestPractices: this.toPercent(cats?.['best-practices']?.score),
      };
    } catch (err) {
      this.logger.warn(`PageSpeed ${url} → ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  private toPercent(score: number | null | undefined): number | null {
    if (score === null || score === undefined) return null;
    return Math.round(score * 100);
  }
}
