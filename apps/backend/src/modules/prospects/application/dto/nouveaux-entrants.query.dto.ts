import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';

export class NouveauxEntrantsQueryDto {
  @ApiPropertyOptional({
    description: 'Âge minimum en jours (par défaut 90 = 3 mois)',
    default: 90,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(365)
  ageMinDays?: number = 90;

  @ApiPropertyOptional({
    description: 'Âge maximum en jours (par défaut 270 = 9 mois)',
    default: 270,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(365)
  ageMaxDays?: number = 270;

  @ApiPropertyOptional({ description: 'Code département', example: '75' })
  @IsOptional()
  @IsString()
  departement?: string;

  @ApiPropertyOptional({ description: 'Code NAF', example: '47.11D' })
  @IsOptional()
  @IsString()
  activitePrincipale?: string;

  @ApiPropertyOptional({ description: "Section d'activité (lettre INSEE)", example: 'I' })
  @IsOptional()
  @IsString()
  sectionActivite?: string;

  @ApiPropertyOptional({
    description: 'Sonder le site web (probe HTTP) — désactiver pour réponse plus rapide',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  probeWebsite?: boolean = true;

  @ApiPropertyOptional({
    description: 'Lancer Lighthouse (PageSpeed Insights) sur les sites détectés — coûteux (~30s/site)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  runLighthouse?: boolean = false;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  perPage?: number = 20;

  @ApiPropertyOptional({
    description: 'Score minimum pour inclure le prospect',
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  minScore?: number = 0;
}
