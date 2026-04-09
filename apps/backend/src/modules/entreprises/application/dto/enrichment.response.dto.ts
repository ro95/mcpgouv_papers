import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO d'enrichissement Pappers — données de contact et financières
 * non disponibles dans les APIs gouvernementales gratuites.
 */
export class EnrichmentResponseDto {
  @ApiProperty({ description: 'SIREN de l\'entreprise enrichie' })
  siren: string;

  @ApiPropertyOptional({ description: 'Site internet de l\'entreprise' })
  siteWeb: string | null;

  @ApiPropertyOptional({ description: 'Adresse email de contact' })
  email: string | null;

  @ApiPropertyOptional({ description: 'Numéro de téléphone' })
  telephone: string | null;

  @ApiPropertyOptional({ description: 'Dernier chiffre d\'affaires connu (€)' })
  chiffreAffaires: number | null;

  @ApiPropertyOptional({ description: 'Dernier résultat net connu (€)' })
  resultat: number | null;

  @ApiPropertyOptional({ description: 'Effectifs salariés (valeur exacte Pappers)' })
  effectifs: number | null;

  @ApiProperty({ description: 'Source de l\'enrichissement' })
  source: 'pappers';

  @ApiProperty({ description: 'true si la clé Pappers est configurée et l\'appel a fonctionné' })
  disponible: boolean;

  @ApiPropertyOptional({ description: 'Message d\'erreur si disponible=false (diagnostic)' })
  erreur?: string | null;
}
