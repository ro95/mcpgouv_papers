/**
 * Entité Entreprise — représentation métier pure, sans dépendance externe.
 * Reflète les données issues du répertoire SIRENE et du RNE.
 */

// Un dirigeant de l'entreprise (utile pour la prospection)
export interface Dirigeant {
  nom: string;
  prenom: string | null;
  qualite: string | null;   // "Président", "Directeur général", etc.
  estPersonnePhysique: boolean;
}

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

export class Entreprise {
  constructor(
    public readonly siren: string,
    public readonly nomRaisonSociale: string,
    public readonly dateCreation: string,
    public readonly activitePrincipale: string,
    public readonly libelleActivitePrincipale: string,
    public readonly categorieEntreprise: string | null,
    public readonly etatAdministratif: 'A' | 'C',
    public readonly siege: Siege,
    public readonly nombreEtablissements: number,
    public readonly nombreEtablissementsOuverts: number,
    public readonly trancheEffectifSalarie: string | null,
    public readonly dateImmatriculation: string | null,
    public readonly dirigeants: Dirigeant[] = [],
    public readonly categorieJuridique: string | null = null,
  ) {}

  get estActive(): boolean {
    return this.etatAdministratif === 'A';
  }

  get dateCreationISO(): Date {
    return new Date(this.dateCreation);
  }

  get ancienneteJours(): number {
    const now = new Date();
    const created = this.dateCreationISO;
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export interface PaginatedEntreprises {
  results: Entreprise[];
  totalResults: number;
  page: number;
  perPage: number;
  totalPages: number;
}
