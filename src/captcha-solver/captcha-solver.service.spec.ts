import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaSolverService } from './captcha-solver.service';

describe('CaptchaSolverService', () => {
  let service: CaptchaSolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaptchaSolverService],
    }).compile();

    service = module.get<CaptchaSolverService>(CaptchaSolverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
