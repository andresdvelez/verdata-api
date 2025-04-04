import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SearchedIdentitiesService } from './searched_identities.service';
import { CreateSearchedIdentityDto } from './dto/create-searched_identity.dto';
import { UpdateSearchedIdentityDto } from './dto/update-searched_identity.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { SearchedIdentity } from './entities/searched_identity.entity';
import { JwtTokenGuard } from 'src/jwt-token/jwt-token.guard';

@ApiTags('Searched Identities')
@ApiBearerAuth('access-token')
@UseGuards(JwtTokenGuard)
@Controller('searched-identities')
export class SearchedIdentitiesController {
  constructor(
    private readonly searchedIdentitiesService: SearchedIdentitiesService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: SearchedIdentity })
  create(@Body() createSearchedIdentityDto: CreateSearchedIdentityDto) {
    return this.searchedIdentitiesService.create(createSearchedIdentityDto);
  }

  @Get()
  @ApiCreatedResponse({ type: SearchedIdentity, isArray: true })
  findAll() {
    return this.searchedIdentitiesService.findAll();
  }

  @Get(':id')
  @ApiCreatedResponse({ type: SearchedIdentity })
  findOne(@Param('id') id: string) {
    return this.searchedIdentitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiCreatedResponse({ type: SearchedIdentity })
  update(
    @Param('id') id: string,
    @Body() updateSearchedIdentityDto: UpdateSearchedIdentityDto,
  ) {
    return this.searchedIdentitiesService.update(id, updateSearchedIdentityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.searchedIdentitiesService.remove(id);
  }
}
