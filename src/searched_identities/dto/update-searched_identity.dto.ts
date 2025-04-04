import { PartialType } from '@nestjs/swagger';
import { SearchedIdentityDto } from './create-searched_identity.dto';

export class UpdateSearchedIdentityDto extends PartialType(
  SearchedIdentityDto,
) {}
