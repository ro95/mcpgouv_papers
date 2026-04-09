import { Injectable } from '@nestjs/common';
import { Entreprise, PaginatedEntreprises } from '../../domain/entreprise.entity';
import type { InseeUniteLegale, InseePeriode, InseeSearchResponse } from '../http-clients/insee-api.client';
import { SireneTabularMapper } from './sirene-tabular.mapper';

/**
 * Mapper INSEE API Sirene V3.11 → entité domaine Entreprise.
 *
 * Différence majeure avec l'API tabulaire :
 * les données courantes (dénomination, activité, état)
 * sont dans periodesUniteLegale[0] (période sans dateFin = période active).
 */
@Injectable()
export class InseeApiMapper {
  constructor(private readonly nafMapper: SireneTabularMapper) {}

  toEntity(raw: InseeUniteLegale): Entreprise {
    const currentPeriod = this.getCurrentPeriod(raw);
    const naf = currentPeriod?.activitePrincipaleUniteLegale ?? '';
    const nom = this.resolveNom(raw, currentPeriod);

    return new Entreprise(
      raw.siren,
      nom,
      raw.dateCreationUniteLegale ?? '',
      naf,
      this.nafMapper.resolveLibelleNaf(naf),
      raw.categorieEntrepriseUniteLegale ?? null,
      currentPeriod?.etatAdministratifUniteLegale ?? 'A',
      {
        siret: currentPeriod?.nicSiegeUniteLegale
          ? `${raw.siren}${currentPeriod.nicSiegeUniteLegale}`
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

  toPaginated(raw: InseeSearchResponse): PaginatedEntreprises {
    const total = raw.header?.total ?? 0;
    const pageSize = raw.header?.nombre ?? 20;
    const offset = raw.header?.debut ?? 0;
    const page = Math.floor(offset / pageSize) + 1;

    return {
      results: (raw.unitesLegales ?? []).map((u) => this.toEntity(u)),
      totalResults: total,
      page,
      perPage: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  /**
   * Retourne la période active (sans dateFin).
   * Si aucune sans dateFin, retourne la première (la plus récente).
   */
  private getCurrentPeriod(raw: InseeUniteLegale): InseePeriode | undefined {
    const periods = raw.periodesUniteLegale ?? [];
    return periods.find((p) => p.dateFin === null) ?? periods[0];
  }

  private resolveNom(raw: InseeUniteLegale, period?: InseePeriode): string {
    if (period?.denominationUniteLegale) return period.denominationUniteLegale;
    if (period?.denominationUsuelle1UniteLegale) return period.denominationUsuelle1UniteLegale;
    if (period?.nomUniteLegale) {
      const prenom = period.prenomUsuelUniteLegale ? `${period.prenomUsuelUniteLegale} ` : '';
      return `${prenom}${period.nomUniteLegale}`.trim();
    }
    // Entreprise à diffusion partielle (données personnelles protégées)
    return raw.statutDiffusionUniteLegale === 'P'
      ? `[Diffusion partielle — SIREN ${raw.siren}]`
      : raw.siren;
  }
}
