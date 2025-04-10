import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CaptchaSolverService } from './captcha-solver.service';
import { CaptchaBypassService } from 'src/captcha-bypass/captcha-bypass.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [CaptchaSolverService, CaptchaBypassService],
  exports: [CaptchaSolverService, CaptchaBypassService],
})
export class CaptchaSolverModule {}
