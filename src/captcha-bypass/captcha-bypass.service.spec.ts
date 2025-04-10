import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaBypassService } from './captcha-bypass.service';

describe('CaptchaBypassService', () => {
  let service: CaptchaBypassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaptchaBypassService],
    }).compile();

    service = module.get<CaptchaBypassService>(CaptchaBypassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
