import { ApiProperty } from '@nestjs/swagger';

export class CreateSearchedIdentityDto {
  @ApiProperty({ required: true })
  document: string;

  @ApiProperty({ required: true })
  nationality: string;

  @ApiProperty({ required: false })
  Report?: string;
}

export class SearchedIdentityDto {
  @ApiProperty({ required: true })
  name: string;

  @ApiProperty({ required: false })
  document?: string;

  @ApiProperty({ required: false })
  document_type?: string;

  @ApiProperty({ required: true })
  nationality: string;

  @ApiProperty({ required: false })
  Report?: string;
}
