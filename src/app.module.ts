import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SearchedIdentitiesModule } from './searched_identities/searched_identities.module';
import { ReportsModule } from './reports/reports.module';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    SearchedIdentitiesModule,
    ReportsModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
