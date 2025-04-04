import { ApiProperty } from '@nestjs/swagger';

export class SearchedIdentity {
  @ApiProperty()
  document: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  nationality: string;

  @ApiProperty()
  document_type: string | null;

  @ApiProperty()
  Report: string | null;
}
