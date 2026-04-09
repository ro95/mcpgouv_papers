import { Entreprise, PaginatedEntreprises } from '../entreprise.entity';

/**
 * Port (interface) du repository — principe D de SOLID.
 * L'application dépend de cette abstraction, pas d'une implémentation concrète.
 */
export interface SearchEntreprisesFilters {
  query?: string;
  page?: number;
  perPage?: number;
  codePostal?: string;
  departement?: string;
  activitePrincipale?: string;
  dateCreationMin?: string; // format YYYY-MM-DD
  dateCreationMax?: string;
  etatAdministratif?: 'A' | 'C';
  trancheEffectifSalarie?: string;
}

export interface IEntreprisesRepository {
  /**
   * Recherche paginée d'entreprises avec filtres optionnels.
   */
  search(filters: SearchEntreprisesFilters): Promise<PaginatedEntreprises>;

  /**
   * Récupère les entreprises créées récemment (N derniers jours).
   */
  findRecent(
    days: number,
    page: number,
    perPage: number,
    filters?: { activitePrincipale?: string; sectionActivite?: string; departement?: string; trancheEffectifSalarie?: string; etatAdministratif?: 'A' | 'C' },
  ): Promise<PaginatedEntreprises>;

  /**
   * Récupère le détail d'une entreprise par son SIREN.
   */
  findBySiren(siren: string): Promise<Entreprise | null>;
}

export const ENTREPRISES_REPOSITORY = Symbol('IEntreprisesRepository');
