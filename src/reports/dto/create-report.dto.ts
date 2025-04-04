import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ description: 'Country code (e.g., COL, MX, AR)' })
  countryCode: string;

  @ApiProperty({ description: 'Document number / ID' })
  documentNumber: string;

  @ApiProperty({ description: 'name / document', required: true })
  searchType: string;
}

export interface VerifyIdentityType {
  ID: string;
  Nombres: string;
  Nacionalidad: string;
  'Tipo de documento': string;
}
