import { Module } from '@nestjs/common';
import { SearchedIdentitiesService } from './searched_identities.service';
import { SearchedIdentitiesController } from './searched_identities.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { BrightDataModule } from 'src/bright-data/bright-data.module';

@Module({
  controllers: [SearchedIdentitiesController],
  providers: [SearchedIdentitiesService],
  imports: [PrismaModule, HttpModule, BrightDataModule],
  exports: [SearchedIdentitiesService],
})
export class SearchedIdentitiesModule {}
