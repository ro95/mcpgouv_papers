import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private readonly baseUrl = 'https://api.insee.fr/api-sirene/3.11';

  constructor(private readonly configService: ConfigService) {}

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
    const q = `dateCreationUniteLegale:[${dateMin} TO ${dateMax}]`;

    this.logger.debug(`[findRecent] q="${q}" nombre=${pageSize} debut=${offset}`);

    const params = new URLSearchParams({ q, nombre: String(pageSize), debut: String(offset) });
    const response = await fetch(`${this.baseUrl}/siren?${params}`, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: 'application/json',
        'X-INSEE-Api-Key-Integration': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`INSEE API HTTP ${response.status}`);
    }

    const data = (await response.json()) as InseeSearchResponse;

    if (data.header?.statut !== 200) {
      throw new Error(`INSEE API erreur ${data.header?.statut}: ${data.header?.message}`);
    }

    return data;
  }
}
