import { Module } from '@nestjs/common';
import { BrightDataService } from './bright-data.service';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [BrightDataService, CaptchaSolverService],
  exports: [BrightDataService],
})
export class BrightDataModule {}
