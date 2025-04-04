import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SearchedIdentitiesModule } from 'src/searched_identities/searched_identities.module';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  imports: [PrismaModule, SearchedIdentitiesModule],
})
export class ReportsModule {}
