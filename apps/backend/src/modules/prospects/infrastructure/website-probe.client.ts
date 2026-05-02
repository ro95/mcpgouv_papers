import { Injectable, Logger } from '@nestjs/common';
import { guessDomains } from './domain-guess';
import { WebsiteSignals } from '../domain/prospect.entity';

interface ProbeRawResult {
  reachable: boolean;
  https: boolean;
  validTls: boolean;
  finalUrl: string | null;
  serverHeader: string | null;
  html: string | null;
}

/**
 * Probe HTTP léger : essaie une liste de domaines candidats,
 * extrait des signaux d'obsolescence du HTML.
 */
@Injectable()
export class WebsiteProbeClient {
  private readonly logger = new Logger(WebsiteProbeClient.name);
  private readonly TIMEOUT_MS = 6_000;
  private readonly MAX_HTML_BYTES = 200_000;

  async probeFromName(nom: string, knownSiteWeb?: string | null): Promise<WebsiteSignals> {
    const candidates = knownSiteWeb
      ? [this.normalizeUrl(knownSiteWeb)]
      : guessDomains(nom).map((d) => `https://${d}`);

    if (candidates.length === 0) {
      return this.emptySignals('', 'unknown');
    }

    for (const url of candidates) {
      const raw = await this.probeUrl(url);
      if (raw.reachable) {
        return this.analyze(url, raw);
      }
    }

    const tried = candidates[0].replace(/^https?:\/\//, '');
    return this.emptySignals(tried, 'no-site');
  }

  async probeUrl(url: string): Promise<ProbeRawResult> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; mcpgouv-prospects/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const finalUrl = res.url;
      const https = finalUrl.startsWith('https://');

      const reader = res.body?.getReader();
      let html = '';
      if (reader) {
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (total < this.MAX_HTML_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.length;
        }
        await reader.cancel().catch(() => undefined);
        html = new TextDecoder('utf-8', { fatal: false }).decode(
          Buffer.concat(chunks.map((c) => Buffer.from(c))),
        );
      }

      return {
        reachable: res.ok,
        https,
        validTls: https,
        finalUrl,
        serverHeader: res.headers.get('server'),
        html,
      };
    } catch (err) {
      this.logger.debug(`probe fail ${url} : ${err instanceof Error ? err.message : err}`);
      return {
        reachable: false,
        https: false,
        validTls: false,
        finalUrl: null,
        serverHeader: null,
        html: null,
      };
    }
  }

  private analyze(triedUrl: string, raw: ProbeRawResult): WebsiteSignals {
    const html = raw.html ?? '';
    const lower = html.toLowerCase();

    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const usesJquery = /jquery[.-]?\d|jquery\.min\.js|jquery\.js/i.test(lower);
    const copyrightYear = this.extractCopyrightYear(html);

    let obsolescenceScore = 0;
    if (!raw.https) obsolescenceScore += 5;
    if (!hasViewport) obsolescenceScore += 3;
    if (usesJquery) obsolescenceScore += 2;
    if (copyrightYear !== null && copyrightYear < 2022) obsolescenceScore += 2;

    const verdict: WebsiteSignals['verdict'] =
      obsolescenceScore >= 5 ? 'obsolete' : 'modern';

    return {
      domainTried: triedUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      reachable: true,
      https: raw.https,
      validTls: raw.validTls,
      hasViewport,
      usesJquery,
      copyrightYear,
      serverHeader: raw.serverHeader,
      finalUrl: raw.finalUrl,
      performanceScore: null,
      seoScore: null,
      bestPracticesScore: null,
      obsolescenceScore,
      verdict,
    };
  }

  private extractCopyrightYear(html: string): number | null {
    const m = html.match(/©\s*(?:&nbsp;)?\s*(\d{4})|copyright\s+(\d{4})/i);
    if (!m) return null;
    const year = parseInt(m[1] ?? m[2], 10);
    return Number.isNaN(year) ? null : year;
  }

  private normalizeUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  private emptySignals(domainTried: string, verdict: WebsiteSignals['verdict']): WebsiteSignals {
    return {
      domainTried,
      reachable: false,
      https: false,
      validTls: false,
      hasViewport: false,
      usesJquery: false,
      copyrightYear: null,
      serverHeader: null,
      finalUrl: null,
      performanceScore: null,
      seoScore: null,
      bestPracticesScore: null,
      obsolescenceScore: verdict === 'no-site' ? 10 : 0,
      verdict,
    };
  }
}
