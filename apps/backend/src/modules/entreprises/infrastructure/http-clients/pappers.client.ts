import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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
  private readonly http: AxiosInstance | null;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('pappers.apiKey') ?? '';
    const baseUrl = this.configService.get<string>('pappers.baseUrl') ?? 'https://api.pappers.fr/v2';

    if (this.apiKey) {
      this.http = axios.create({
        baseURL: baseUrl,
        timeout: 15_000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'mcpgouv/1.0.0',
        },
      });

      this.http.interceptors.response.use(
        (res) => res,
        (err) => {
          this.logger.error(
            `[Pappers] ${err.config?.url} → ${err.response?.status ?? err.message}`,
          );
          return Promise.reject(err);
        },
      );

      this.logger.log('✅ Pappers API configurée');
    } else {
      this.http = null;
      this.logger.warn(
        '⚠️ PAPPERS_API_KEY non définie — enrichissement désactivé',
      );
    }
  }

  /** Vérifie si la clé Pappers est configurée. */
  get isConfigured(): boolean {
    return !!this.http;
  }

  /**
   * Enrichit une entreprise par son SIREN.
   * Retourne les données de contact + financières.
   *
   * @param siren - Numéro SIREN à 9 chiffres
   * @returns Données enrichies ou null si non configuré / erreur
   */
  async getEntreprise(siren: string): Promise<PappersEntreprise | null> {
    if (!this.http) return null;

    try {
      const response = await this.http.get<PappersEntreprise>('/entreprise', {
        params: {
          api_token: this.apiKey,
          siren,
          // Champs supplémentaires : email + téléphone (+1 token)
          champs_supplementaires: 'email,telephone,site_web',
        },
      });

      this.logger.debug(`[getEntreprise] SIREN ${siren} → OK`);
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      this.logger.error(
        `[getEntreprise] SIREN ${siren} → HTTP ${status ?? '?'} : ${JSON.stringify(body) ?? err.message}`,
      );
      // Remonter l'erreur pour que le service puisse la distinguer de "non configuré"
      throw new Error(
        `Pappers API erreur HTTP ${status ?? '?'} : ${typeof body === 'string' ? body : JSON.stringify(body) ?? err.message}`,
      );
    }
  }
}
