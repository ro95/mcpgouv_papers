import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntrepriseDto } from '../../../entreprises/application/dto/paginated-entreprises.response.dto';

export class WebsiteSignalsDto {
  @ApiProperty() domainTried!: string;
  @ApiProperty() reachable!: boolean;
  @ApiProperty() https!: boolean;
  @ApiProperty() validTls!: boolean;
  @ApiProperty() hasViewport!: boolean;
  @ApiProperty() usesJquery!: boolean;
  @ApiPropertyOptional({ nullable: true }) copyrightYear!: number | null;
  @ApiPropertyOptional({ nullable: true }) serverHeader!: string | null;
  @ApiPropertyOptional({ nullable: true }) finalUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) performanceScore!: number | null;
  @ApiPropertyOptional({ nullable: true }) seoScore!: number | null;
  @ApiPropertyOptional({ nullable: true }) bestPracticesScore!: number | null;
  @ApiProperty() obsolescenceScore!: number;
  @ApiProperty({ enum: ['no-site', 'obsolete', 'modern', 'unknown'] })
  verdict!: 'no-site' | 'obsolete' | 'modern' | 'unknown';
}

export class ProspectScoreDto {
  @ApiProperty() total!: number;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  breakdown!: Record<string, number>;
  @ApiProperty({ enum: ['cold', 'warm', 'hot'] }) tier!: 'cold' | 'warm' | 'hot';
}

export class ProspectDto {
  @ApiProperty({ type: EntrepriseDto }) entreprise!: EntrepriseDto;
  @ApiProperty({ type: ProspectScoreDto }) score!: ProspectScoreDto;
  @ApiPropertyOptional({ type: WebsiteSignalsDto, nullable: true })
  website!: WebsiteSignalsDto | null;
}

export class PaginatedProspectsDto {
  @ApiProperty({ type: [ProspectDto] }) results!: ProspectDto[];
  @ApiProperty() totalScanned!: number;
  @ApiProperty() totalAfterFilter!: number;
  @ApiProperty() page!: number;
  @ApiProperty() perPage!: number;
}
