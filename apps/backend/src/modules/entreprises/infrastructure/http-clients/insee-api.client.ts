import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────
// Types — réponse INSEE Sirene V3.11
// ─────────────────────────────────────────────

export interface InseePeriode {
  dateFin: string | null;
  dateDebut: string;
  etatAdministratifUniteLegale: 'A' | 'C';
  denominationUniteLegale: string | null;
  denominationUsuelle1UniteLegale: string | null;
  nomUniteLegale: string | null;
  prenomUsuelUniteLegale: string | null;
  activitePrincipaleUniteLegale: string | null;
  categorieJuridiqueUniteLegale: string | null;
  nicSiegeUniteLegale: string | null;
}

export interface InseeUniteLegale {
  siren: string;
  dateCreationUniteLegale: string;
  trancheEffectifsUniteLegale: string | null;
  categorieEntrepriseUniteLegale: string | null;
  statutDiffusionUniteLegale: 'O' | 'P';
  periodesUniteLegale: InseePeriode[];
}

export interface InseeSearchResponse {
  header: { statut: number; message: string; total: number; debut: number; nombre: number };
  unitesLegales: InseeUniteLegale[];
}

// ─────────────────────────────────────────────
// Client INSEE API Sirene V3.11
//
// Plan "api key" — une seule clé suffit, pas d'OAuth2.
//
// Comment obtenir la clé :
//   1. https://portail-api.insee.fr → Applications → Souscriptions
//   2. Clique sur la ligne "API Sirene" → copie la valeur dans "Clés d'API"
//   3. Colle dans apps/backend/.env : INSEE_API_KEY=ta_clé
//
// Rate limit : 30 req/min
// ─────────────────────────────────────────────

@Injectable()
export class InseeApiClient {
  private readonly logger = new Logger(InseeApiClient.name);
  private readonly api: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.api = axios.create({
      baseURL: 'https://api.insee.fr/api-sirene/3.11',
      timeout: 20_000,
      headers: { Accept: 'application/json' },
    });
  }

  get isConfigured(): boolean {
    const key = this.configService.get<string>('insee.apiKey');
    return !!(key && key.length > 0);
  }

  async findRecent(
    dateMin: string,
    dateMax: string,
    page: number,
    pageSize: number,
  ): Promise<InseeSearchResponse> {
    if (!this.isConfigured) {
      throw new Error(
        'INSEE_API_KEY manquant dans .env. ' +
        'Récupère ta clé sur portail-api.insee.fr → Applications → Souscriptions.',
      );
    }

    const apiKey = this.configService.get<string>('insee.apiKey')!;
    const offset = (page - 1) * pageSize;
    // Requête simplifiée : filtrage sur date de création uniquement
    // (le filtre nested periodesUniteLegale cause des erreurs sur certains plans)
    const q = `dateCreationUniteLegale:[${dateMin} TO ${dateMax}]`;

    this.logger.debug(`[findRecent] q="${q}" nombre=${pageSize} debut=${offset}`);

    // L'API Sirene INSEE accepte la clé via deux headers selon le plan :
    // - "api key" plan : X-INSEE-Api-Key-Integration (header direct, pas d'OAuth2)
    // - OAuth2 plan   : Authorization: Bearer {token}
    const { data } = await this.api.get<InseeSearchResponse>('/siren', {
      params: { q, nombre: pageSize, debut: offset },
      headers: {
        'X-INSEE-Api-Key-Integration': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (data.header?.statut !== 200) {
      throw new Error(`INSEE API erreur ${data.header?.statut}: ${data.header?.message}`);
    }

    return data;
  }
}
