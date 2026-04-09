import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────
// Types bruts renvoyés par l'API
// ─────────────────────────────────────────────

export interface RawSiege {
  siret: string;
  code_postal: string;
  libelle_commune: string;
  departement: string;
  region: string;
  adresse: string;
  latitude?: number;
  longitude?: number;
}

// Un dirigeant retourné par l'API (personne physique ou morale)
export interface RawDirigeant {
  nom: string | null;
  prenoms: string | null;
  qualite: string | null;           // ex: "Président", "Directeur général"
  type_dirigeant: string | null;    // "personne physique" ou "personne morale"
  denomination: string | null;      // si personne morale
}

export interface RawEntreprise {
  siren: string;
  nom_raison_sociale: string;
  date_creation: string;
  activite_principale: string;
  libelle_activite_principale: string;
  categorie_entreprise: string | null;
  etat_administratif: 'A' | 'C';
  siege: RawSiege;
  nombre_etablissements: number;
  nombre_etablissements_ouverts: number;
  tranche_effectif_salarie: string | null;
  date_immatriculation: string | null;
  dirigeants?: RawDirigeant[] | null; // ← nouveau : les dirigeants de l'entreprise
}

export interface RawSearchResponse {
  results: RawEntreprise[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RechercheEntreprisesParams {
  q?: string;
  page?: number;
  per_page?: number; // max 25 imposé par l'API (doc officielle)
  code_postal?: string;
  departement?: string;
  activite_principale?: string;
  // Section d'activité (lettre) : F=Construction, Q=Santé, I=Restauration, S=Services, M=Conseil...
  // Plus pratique que activite_principale pour cibler un secteur entier.
  section_activite_principale?: string;
  // Note : date_creation_min/max ne sont PAS supportés par cette API.
  // Pour filtrer par date, utiliser SireneTabularClient.
  etat_administratif?: 'A' | 'C';
  tranche_effectif_salarie?: string;
  sort_by_size?: boolean;
}

/**
 * Client HTTP pour l'API Recherche d'entreprises de data.gouv.fr.
 *
 * Base URL : https://recherche-entreprises.api.gouv.fr
 * Doc      : https://recherche-entreprises.api.gouv.fr/docs/
 * Accès    : public, sans clé API
 */
@Injectable()
export class RechercheEntreprisesClient {
  private readonly logger = new Logger(RechercheEntreprisesClient.name);
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>(
      'api.rechercheEntreprisesBaseUrl',
    )!;

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 15_000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'api-entreprises/1.0.0',
      },
    });

    this.http.interceptors.response.use(
      (res) => res,
      (err) => {
        this.logger.error(
          `[RechercheEntreprises] ${err.config?.url} → ${err.response?.status ?? err.message}`,
        );
        return Promise.reject(err);
      },
    );
  }

  /**
   * Recherche d'entreprises avec filtres.
   */
  async search(params: RechercheEntreprisesParams): Promise<RawSearchResponse> {
    // Nettoyer les paramètres undefined
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    );

    const response = await this.http.get<RawSearchResponse>('/search', {
      params: cleanParams,
    });

    this.logger.debug(
      `[search] ${JSON.stringify(cleanParams)} → ${response.data.total_results} résultats`,
    );

    return response.data;
  }

  /**
   * Récupère une entreprise par son SIREN (recherche directe).
   */
  async findBySiren(siren: string): Promise<RawEntreprise | null> {
    const response = await this.search({ q: `siren:${siren}`, per_page: 1 });
    return response.results[0] ?? null;
  }
}
