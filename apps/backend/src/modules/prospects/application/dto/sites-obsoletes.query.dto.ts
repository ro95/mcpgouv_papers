import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SitesObsoletesQueryDto {
  @ApiProperty({ description: 'Code département (ex: 93)', example: '93' })
  @IsString()
  departement!: string;

  @ApiPropertyOptional({ description: "Section d'activité INSEE (I, F, M, Q, G, J)", example: 'F' })
  @IsOptional()
  @IsString()
  sectionActivite?: string;

  @ApiPropertyOptional({ description: 'Code NAF précis', example: '43.99C' })
  @IsOptional()
  @IsString()
  activitePrincipale?: string;

  @ApiPropertyOptional({
    description: 'Budget Pappers maximum à dépenser pour ce run (crédits)',
    default: 60,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(500)
  pappersBudget?: number = 60;

  @ApiPropertyOptional({
    description: "Nombre maximum de candidats à enrichir via Pappers",
    default: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  maxEnrich?: number = 50;

  @ApiPropertyOptional({
    description: 'Filtre dur : email + téléphone + site requis',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requireFullContact?: boolean = true;

  @ApiPropertyOptional({
    description: 'Lancer Lighthouse (PageSpeed) sur les sites détectés',
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

  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 30;
}
