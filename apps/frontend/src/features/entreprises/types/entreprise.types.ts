// ─────────────────────────────────────────────
// Types domaine — mirror des DTOs du backend
// ─────────────────────────────────────────────

export interface Siege {
  siret: string;
  codePostal: string;
  libelleCommune: string;
  departement: string;
  region: string;
  adresse: string;
  latitude?: number;
  longitude?: number;
}

export interface Entreprise {
  siren: string;
  nomRaisonSociale: string;
  dateCreation: string;
  activitePrincipale: string;
  libelleActivitePrincipale: string;
  categorieEntreprise: string | null;
  etatAdministratif: 'A' | 'C';
  siege: Siege;
  nombreEtablissements: number;
  nombreEtablissementsOuverts: number;
  trancheEffectifSalarie: string | null;
  dateImmatriculation: string | null;
  ancienneteJours: number;
}

export interface PaginationMeta {
  totalResults: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginatedEntreprises {
  results: Entreprise[];
  pagination: PaginationMeta;
}

export interface EntreprisesStats {
  totalRecentCreations: number;
  periodDays: number;
  dateMin: string;
  dateMax: string;
}

// ─────────────────────────────────────────────
// Enrichissement Pappers
// ─────────────────────────────────────────────

export interface Enrichment {
  siren: string;
  siteWeb: string | null;
  email: string | null;
  telephone: string | null;
  chiffreAffaires: number | null;
  resultat: number | null;
  effectifs: number | null;
  source: 'pappers';
  disponible: boolean;
  erreur?: string | null;
}

// ─────────────────────────────────────────────
// Paramètres de requête
// ─────────────────────────────────────────────

export interface SearchEntreprisesParams {
  q?: string;
  page?: number;
  perPage?: number;
  codePostal?: string;
  departement?: string;
  activitePrincipale?: string;
  dateCreationMin?: string;
  dateCreationMax?: string;
  etatAdministratif?: 'A' | 'C';
  trancheEffectifSalarie?: string;
}

export interface RecentEntreprisesParams {
  days?: number;
  page?: number;
  perPage?: number;
  departement?: string;
  activitePrincipale?: string;
  trancheEffectifSalarie?: string;
  etatAdministratif?: 'A' | 'C';
}

// ─────────────────────────────────────────────
// Réponse enveloppée par le backend
// ─────────────────────────────────────────────

export interface ApiEnvelope<T> {
  data: T;
  success: boolean;
  timestamp: string;
}
