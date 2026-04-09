import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

/**
 * DTO pour l'export CSV des entreprises filtrées.
 * Reprend les mêmes filtres que RecentEntreprisesQueryDto
 * avec un plafond de 50 résultats max (enrichissement Pappers coûteux).
 */
export class ExportEntreprisesQueryDto {
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

  @ApiPropertyOptional({
    description: 'Nombre max d\'entreprises à exporter (après filtrage email)',
    default: 50,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 50;

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
    description: 'Tranche d\'effectif salarié — codes INSEE séparés par virgule.',
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
