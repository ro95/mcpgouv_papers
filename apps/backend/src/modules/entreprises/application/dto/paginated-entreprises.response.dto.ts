import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DirigeantDto {
  @ApiProperty({ description: 'Nom de famille ou dénomination sociale' })
  nom: string;

  @ApiPropertyOptional({ description: 'Prénom' })
  prenom: string | null;

  @ApiPropertyOptional({ description: 'Rôle : Président, Directeur général...' })
  qualite: string | null;

  @ApiProperty({ description: 'true = personne physique, false = personne morale' })
  estPersonnePhysique: boolean;
}

export class SiegeDto {
  @ApiProperty() siret: string;
  @ApiProperty() codePostal: string;
  @ApiProperty() libelleCommune: string;
  @ApiProperty() departement: string;
  @ApiProperty() region: string;
  @ApiProperty() adresse: string;
  @ApiPropertyOptional() latitude?: number;
  @ApiPropertyOptional() longitude?: number;
}

export class EntrepriseDto {
  @ApiProperty({ description: 'Numéro SIREN (9 chiffres)' })
  siren: string;

  @ApiProperty() nomRaisonSociale: string;
  @ApiProperty({ description: 'Date de création (YYYY-MM-DD)' })
  dateCreation: string;

  @ApiProperty({ description: 'Code NAF' })
  activitePrincipale: string;

  @ApiProperty({ description: 'Libellé de l\'activité principale' })
  libelleActivitePrincipale: string;

  @ApiPropertyOptional({ description: 'Catégorie (PME, ETI, GE...)' })
  categorieEntreprise: string | null;

  @ApiProperty({ enum: ['A', 'C'], description: 'A=actif, C=cessé' })
  etatAdministratif: 'A' | 'C';

  @ApiProperty({ type: SiegeDto })
  siege: SiegeDto;

  @ApiProperty() nombreEtablissements: number;
  @ApiProperty() nombreEtablissementsOuverts: number;
  @ApiPropertyOptional() trancheEffectifSalarie: string | null;
  @ApiPropertyOptional() dateImmatriculation: string | null;

  @ApiProperty({ description: 'Âge de l\'entreprise en jours' })
  ancienneteJours: number;

  @ApiProperty({ type: [DirigeantDto], description: 'Dirigeants de l\'entreprise' })
  dirigeants: DirigeantDto[];
}

export class PaginationMeta {
  @ApiProperty() totalResults: number;
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedEntreprisesResponseDto {
  @ApiProperty({ type: [EntrepriseDto] }) results: EntrepriseDto[];
  @ApiProperty({ type: PaginationMeta }) pagination: PaginationMeta;
}
