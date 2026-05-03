import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─────────────────────────────────────────────
// Types bruts renvoyés par l'API Pappers v2
// ─────────────────────────────────────────────

export interface PappersFinances {
  annee?: number;
  chiffre_affaires?: number;
  resultat?: number;
  effectifs?: number;
}

export interface PappersEntreprise {
  siren: string;
  nom_entreprise: string;
  site_web: string | null;
  telephone: string | null;
  email: string | null;
  chiffre_affaires: number | null;
  resultat: number | null;
  effectifs: number | null;
  // Les finances détaillées par année
  finances: PappersFinances[];
}

/**
 * Client HTTP pour l'API Pappers v2.
 *
 * Base URL : https://api.pappers.fr/v2
 * Doc      : https://www.pappers.fr/api/documentation
 * Accès    : clé API requise (100 crédits gratuits à l'inscription)
 *
 * Consommation de tokens :
 *  - 1 token par appel GET /entreprise
 *  - +1 token si champs_supplementaires contient « email,telephone »
 */
export interface PappersResult<T> {
  data: T;
  cost: number;
}

@Injectable()
export class PappersClient {
  private readonly logger = new Logger(PappersClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly configured: boolean;
  private cumulativeCost = 0;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('pappers.apiKey') ?? '';
    this.baseUrl = this.configService.get<string>('pappers.baseUrl') ?? 'https://api.pappers.fr/v2';
    this.configured = !!this.apiKey;

    if (this.configured) {
      this.logger.log('✅ Pappers API configurée');
    } else {
      this.logger.warn('⚠️ PAPPERS_API_KEY non définie — enrichissement désactivé');
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  /** Total des crédits consommés depuis le démarrage du process. */
  get totalCost(): number {
    return this.cumulativeCost;
  }

  resetCost(): void {
    this.cumulativeCost = 0;
  }

  async getEntreprise(siren: string): Promise<PappersEntreprise | null> {
    const result = await this.getEntrepriseWithCost(siren);
    return result?.data ?? null;
  }

  /**
   * Variante qui retourne data + coût en crédits Pappers (header x-request-cost).
   * Le coût varie selon la taille de la réponse (1 pour TPE, 4-7 pour grosses entreprises).
   */
  async getEntrepriseWithCost(siren: string): Promise<PappersResult<PappersEntreprise> | null> {
    if (!this.configured) return null;

    const params = new URLSearchParams({
      api_token: this.apiKey,
      siren,
      champs_supplementaires: 'email,telephone,site_web',
    });

    try {
      const result = await this.fetchJsonWithCost<PappersEntreprise>(`/entreprise?${params}`);
      this.logger.debug(`[getEntreprise] SIREN ${siren} → OK (coût=${result.cost})`);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[getEntreprise] SIREN ${siren} → ${message}`);
      throw new Error(`Pappers API erreur: ${message}`);
    }
  }

  private async fetchJsonWithCost<T>(path: string): Promise<PappersResult<T>> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'mcpgouv/1.0.0',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    const cost = parseInt(response.headers.get('x-request-cost') ?? '0', 10) || 0;
    this.cumulativeCost += cost;
    const data = (await response.json()) as T;
    return { data, cost };
  }
}
