import { Module } from '@nestjs/common';
import { BrightDataService } from './bright-data.service';
import { HttpModule } from '@nestjs/axios';
import { CaptchaBypassService } from 'src/captcha-bypass/captcha-bypass.service';
import { CaptchaSolverModule } from 'src/captcha-solver/captcha-solver.module';

@Module({
  imports: [HttpModule, CaptchaSolverModule],
  providers: [BrightDataService, CaptchaBypassService],
  exports: [BrightDataService],
})
export class BrightDataModule {}
