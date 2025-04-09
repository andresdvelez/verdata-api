import { Test, TestingModule } from '@nestjs/testing';
import { BrightDataService } from './bright-data.service';

describe('BrightDataService', () => {
  let service: BrightDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrightDataService],
    }).compile();

    service = module.get<BrightDataService>(BrightDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
