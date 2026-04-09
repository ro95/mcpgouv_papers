import { Injectable } from '@nestjs/common';
import { Entreprise, PaginatedEntreprises } from '../../domain/entreprise.entity';
import type {
  RawSireneUniteLegale,
  TabularApiResponse,
} from '../http-clients/sirene-tabular.client';

// ─────────────────────────────────────────────
// Table partielle NAF code → libellé
// Couvre les codes les plus fréquents pour l'affichage.
// Le reste affiche directement le code.
// ─────────────────────────────────────────────
const NAF_LIBELLES: Record<string, string> = {
  '86.21Z': 'Médecine générale',
  '86.22A': 'Radiodiagnostic et radiothérapie',
  '86.22B': 'Chirurgie',
  '86.22C': 'Gynécologie-obstétrique',
  '86.23Z': 'Pratique dentaire',
  '86.90A': 'Ambulances',
  '86.90B': 'Laboratoires d\'analyses médicales',
  '86.90D': 'Infirmiers, sages-femmes',
  '86.90E': 'Rééducation, appareillage, podologie',
  '86.90F': 'Autres activités de santé humaine',
  '47.73Z': 'Pharmacie',
  '47.78A': 'Optique, audioprothèse',
  '75.00Z': 'Activité vétérinaire',
  '62.01Z': 'Programmation informatique',
  '62.02A': 'Conseil en systèmes informatiques',
  '62.09Z': 'Autres activités informatiques',
  '63.12Z': 'Portails internet',
  '74.10Z': 'Activités spécialisées de design',
  '70.22Z': 'Conseil en gestion',
  '69.10Z': 'Activités juridiques',
  '69.20Z': 'Activités comptables',
  '71.11Z': 'Activités d\'architecture',
  '71.12B': 'Ingénierie, études techniques',
  '85.59B': 'Autres enseignements',
  '78.10Z': 'Activités des agences de travail temporaire',
  '68.31Z': 'Agences immobilières',
  '65.12Z': 'Autres assurances',
  '56.10A': 'Restauration traditionnelle',
  '56.10C': 'Restauration rapide',
  '56.30Z': 'Débits de boissons',
  '47.24Z': 'Commerce de pain, pâtisserie',
  '47.22Z': 'Commerce de viandes',
  '47.11B': 'Supérettes',
  '47.71Z': 'Commerce de vêtements',
  '47.76Z': 'Commerce de fleurs',
  '47.61Z': 'Commerce de livres',
  '43.22A': 'Travaux de plomberie',
  '43.21A': 'Travaux d\'installation électrique',
  '43.99B': 'Maçonnerie',
  '43.34Z': 'Peinture',
  '43.91A': 'Charpente',
  '43.91B': 'Couverture',
  '43.32A': 'Menuiserie',
  '43.33Z': 'Revêtements de sols',
  '41.20A': 'Construction de maisons individuelles',
  '43.29A': 'Serrurerie',
  '96.02A': 'Coiffure',
  '96.02B': 'Soins de beauté',
  '96.09Z': 'Autres services aux personnes',
  '85.51Z': 'Enseignement de disciplines sportives',
  '85.53Z': 'Enseignement de la conduite',
  '88.91A': 'Accueil de jeunes enfants',
  '49.32Z': 'Transports de voyageurs par taxis',
  '49.41A': 'Transports routiers de fret',
  '49.42Z': 'Déménagement',
  '53.20Z': 'Autres activités de poste',
  '10.71C': 'Boulangerie',
};

@Injectable()
export class SireneTabularMapper {
  /**
   * Résout le libellé d'un code NAF.
   * Fallback : retourne le code lui-même.
   */
  resolveLibelleNaf(code: string): string {
    return NAF_LIBELLES[code] ?? code;
  }

  /**
   * Détermine le nom d'affichage d'une unité légale.
   * Priorité : denomination → nom personne physique → siren
   */
  resolveNom(raw: RawSireneUniteLegale): string {
    if (raw.denominationUniteLegale) return raw.denominationUniteLegale;
    if (raw.denominationUsuelle1UniteLegale)
      return raw.denominationUsuelle1UniteLegale;
    if (raw.nomUniteLegale) {
      const prenom = raw.prenomUsuelUniteLegale
        ? `${raw.prenomUsuelUniteLegale} `
        : '';
      return `${prenom}${raw.nomUniteLegale}`.trim();
    }
    return raw.siren;
  }

  toEntity(raw: RawSireneUniteLegale): Entreprise {
    const naf = raw.activitePrincipaleUniteLegale ?? '';
    return new Entreprise(
      raw.siren,
      this.resolveNom(raw),
      raw.dateCreationUniteLegale ?? '',
      naf,
      this.resolveLibelleNaf(naf),
      raw.categorieEntrepriseUniteLegale ?? null,
      raw.etatAdministratifUniteLegale ?? 'A',
      {
        siret: raw.nicsiegeUniteLegale
          ? `${raw.siren}${raw.nicsiegeUniteLegale}`
          : '',
        codePostal: '',
        libelleCommune: '',
        departement: '',
        region: '',
        adresse: '',
      },
      1,
      1,
      raw.trancheEffectifsUniteLegale ?? null,
      null,
    );
  }

  toPaginated(raw: TabularApiResponse): PaginatedEntreprises {
    const total = raw.meta?.total ?? 0;
    const pageSize = raw.meta?.page_size ?? 20;

    return {
      results: (raw.data ?? []).map((r) => this.toEntity(r)),
      totalResults: total,
      page: raw.meta?.page ?? 1,
      perPage: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
