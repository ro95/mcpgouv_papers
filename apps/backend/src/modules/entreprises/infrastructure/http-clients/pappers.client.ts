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
@Injectable()
export class PappersClient {
  private readonly logger = new Logger(PappersClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly configured: boolean;

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

  /** Vérifie si la clé Pappers est configurée. */
  get isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Enrichit une entreprise par son SIREN.
   * Retourne les données de contact + financières.
   *
   * @param siren - Numéro SIREN à 9 chiffres
   * @returns Données enrichies ou null si non configuré / erreur
   */
  async getEntreprise(siren: string): Promise<PappersEntreprise | null> {
    if (!this.configured) return null;

    const params = new URLSearchParams({
      api_token: this.apiKey,
      siren,
      // Champs supplémentaires : email + téléphone (+1 token)
      champs_supplementaires: 'email,telephone,site_web',
    });

    try {
      const data = await this.fetchJson<PappersEntreprise>(`/entreprise?${params}`);
      this.logger.debug(`[getEntreprise] SIREN ${siren} → OK`);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[getEntreprise] SIREN ${siren} → ${message}`);
      throw new Error(`Pappers API erreur: ${message}`);
    }
  }

  private async fetchJson<T>(path: string): Promise<T> {
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

    return response.json() as Promise<T>;
  }
}
