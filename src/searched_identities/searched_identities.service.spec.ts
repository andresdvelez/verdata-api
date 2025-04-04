import { Test, TestingModule } from '@nestjs/testing';
import { SearchedIdentitiesService } from './searched_identities.service';

describe('SearchedIdentitiesService', () => {
  let service: SearchedIdentitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchedIdentitiesService],
    }).compile();

    service = module.get<SearchedIdentitiesService>(SearchedIdentitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
