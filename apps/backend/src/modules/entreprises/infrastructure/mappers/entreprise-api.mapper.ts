import { Injectable } from '@nestjs/common';
import { Dirigeant, Entreprise, PaginatedEntreprises, Siege } from '../../domain/entreprise.entity';
import { RawDirigeant, RawEntreprise, RawSearchResponse } from '../http-clients/recherche-entreprises.client';

/**
 * Mapper — isole la transformation du modèle API externe vers l'entité domaine.
 * Respecte le principe de responsabilité unique (S de SOLID).
 */
@Injectable()
export class EntrepriseApiMapper {
  toEntity(raw: RawEntreprise): Entreprise {
    const siege: Siege = {
      siret: raw.siege?.siret ?? '',
      codePostal: raw.siege?.code_postal ?? '',
      libelleCommune: raw.siege?.libelle_commune ?? '',
      departement: raw.siege?.departement ?? '',
      region: raw.siege?.region ?? '',
      adresse: raw.siege?.adresse ?? '',
      latitude: raw.siege?.latitude,
      longitude: raw.siege?.longitude,
    };

    // Transformer les dirigeants bruts en objets propres
    const dirigeants: Dirigeant[] = (raw.dirigeants ?? [])
      .filter((d) => d.nom || d.denomination) // exclure les entrées vides
      .map((d: RawDirigeant): Dirigeant => ({
        nom: d.denomination ?? d.nom ?? '',
        prenom: d.prenoms ?? null,
        qualite: d.qualite ?? null,
        estPersonnePhysique: d.type_dirigeant === 'personne physique',
      }));

    return new Entreprise(
      raw.siren,
      raw.nom_raison_sociale ?? '',
      raw.date_creation ?? '',
      raw.activite_principale ?? '',
      raw.libelle_activite_principale ?? '',
      raw.categorie_entreprise ?? null,
      raw.etat_administratif ?? 'A',
      siege,
      raw.nombre_etablissements ?? 0,
      raw.nombre_etablissements_ouverts ?? 0,
      raw.tranche_effectif_salarie ?? null,
      raw.date_immatriculation ?? null,
      dirigeants, // ← on passe les dirigeants
    );
  }

  toPaginated(raw: RawSearchResponse): PaginatedEntreprises {
    return {
      results: raw.results.map((r) => this.toEntity(r)),
      totalResults: raw.total_results,
      page: raw.page,
      perPage: raw.per_page,
      totalPages: raw.total_pages,
    };
  }
}
