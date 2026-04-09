import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsIn,
} from 'class-validator';

export class SearchEntreprisesQueryDto {
  @ApiPropertyOptional({
    description: 'Terme de recherche (nom, SIREN, dirigeant...)',
    example: 'boulangerie',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Résultats par page — max 25 (limite de l\'API Recherche d\'entreprises)',
    default: 20,
    maximum: 25,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(25)
  perPage?: number = 20;

  @ApiPropertyOptional({ description: 'Code postal', example: '75001' })
  @IsOptional()
  @IsString()
  codePostal?: string;

  @ApiPropertyOptional({ description: 'Code département', example: '75' })
  @IsOptional()
  @IsString()
  departement?: string;

  @ApiPropertyOptional({
    description: 'Code NAF / activité principale',
    example: '62.01Z',
  })
  @IsOptional()
  @IsString()
  activitePrincipale?: string;

  @ApiPropertyOptional({
    description: 'Date de création minimum (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateCreationMin?: string;

  @ApiPropertyOptional({
    description: 'Date de création maximum (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateCreationMax?: string;

  @ApiPropertyOptional({
    description: 'État administratif : A (actif) ou C (cessé)',
    enum: ['A', 'C'],
    default: 'A',
  })
  @IsOptional()
  @IsIn(['A', 'C'])
  etatAdministratif?: 'A' | 'C' = 'A';

  @ApiPropertyOptional({
    description:
      'Tranche d\'effectif salarié (code INSEE). ' +
      'Valeurs : NN (non-employeur), 00 (0 salarié), 01 (1-2), 02 (3-5), ' +
      '03 (6-9), 11 (10-19), 12 (20-49), 21 (50-99), 22 (100-199), ' +
      '31 (200-249), 32 (250-499), 41 (500-999), 42 (1000-1999), ' +
      '51 (2000-4999), 52 (5000-9999), 53 (10000+).',
    example: '12',
  })
  @IsOptional()
  @IsString()
  trancheEffectifSalarie?: string;
}

export class RecentEntreprisesQueryDto {
  @ApiPropertyOptional({
    description: 'Nombre de jours à remonter',
    default: 30,
    maximum: 365,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;

  @ApiPropertyOptional({ description: 'Code département', example: '75' })
  @IsOptional()
  @IsString()
  departement?: string;

  @ApiPropertyOptional({ description: 'Code NAF', example: '62.01Z' })
  @IsOptional()
  @IsString()
  activitePrincipale?: string;

  @ApiPropertyOptional({ description: 'Section d\'activité (lettre INSEE)', example: 'F' })
  @IsOptional()
  @IsString()
  sectionActivite?: string;

  @ApiPropertyOptional({
    description:
      'Tranche d\'effectif salarié — codes INSEE séparés par virgule. ' +
      'Ex : "01,02" pour 1-5 salariés, "12,21" pour 20-99.',
    example: '12,21',
  })
  @IsOptional()
  @IsString()
  trancheEffectifSalarie?: string;

  @ApiPropertyOptional({
    description: 'État administratif : A (actif) ou C (cessé)',
    enum: ['A', 'C'],
  })
  @IsOptional()
  @IsIn(['A', 'C'])
  etatAdministratif?: 'A' | 'C';
}
