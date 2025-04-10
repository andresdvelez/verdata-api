import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SearchedIdentitiesModule } from './searched_identities/searched_identities.module';
import { ReportsModule } from './reports/reports.module';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { BrightDataModule } from './bright-data/bright-data.module';
import { CaptchaSolverService } from './captcha-solver/captcha-solver.service';
import { HttpModule } from '@nestjs/axios';
import { CaptchaBypassService } from './captcha-bypass/captcha-bypass.service';
import { CaptchaSolverModule } from './captcha-solver/captcha-solver.module';

@Module({
  imports: [
    PrismaModule,
    SearchedIdentitiesModule,
    ReportsModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),
    BrightDataModule,
    HttpModule,
    CaptchaSolverModule,
  ],
  exports: [CaptchaSolverService, CaptchaBypassService],
  providers: [JwtStrategy, CaptchaSolverService, CaptchaBypassService],
})
export class AppModule {}
