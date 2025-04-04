import { Module } from '@nestjs/common';
import { SearchedIdentitiesService } from './searched_identities.service';
import { SearchedIdentitiesController } from './searched_identities.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [SearchedIdentitiesController],
  providers: [SearchedIdentitiesService],
  imports: [PrismaModule, HttpModule],
  exports: [SearchedIdentitiesService],
})
export class SearchedIdentitiesModule {}
