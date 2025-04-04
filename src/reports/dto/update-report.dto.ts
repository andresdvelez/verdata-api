import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateReportDto } from './create-report.dto';
import { InputJsonObject } from '@prisma/client/runtime/library';

export class UpdateReportDto extends PartialType(CreateReportDto) {
  @ApiProperty({ required: false })
  is_identity_matched?: boolean;

  @ApiProperty({ required: false })
  risk_score?: number;

  @ApiProperty({ required: false })
  sanctions_lists?: InputJsonObject;

  @ApiProperty({ required: false })
  peps_verification?: boolean;

  @ApiProperty({ required: false })
  criminal_records?: boolean;

  @ApiProperty({ required: false })
  news_media?: boolean;

  @ApiProperty({ required: false })
  search_data?: string;

  @ApiProperty({ required: false })
  search_type?: string;
}

export class SanctionsListsDto {
  // Other properties

  sanctions_lists?: {
    international: {
      overall: boolean;

      lists: Array<{
        organization: string;

        scope: string;

        lists: Array<{
          listName: string;

          description: string;

          result: boolean;
        }>;
      }>;
    };

    national: {
      overall: boolean;

      lists: Array<{
        countryCode: string;

        countryName: string;

        lists: Array<{
          listName: string;

          description: string;

          result: boolean;
        }>;
      }>;
    };
  };
}
