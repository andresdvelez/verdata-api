import { Test, TestingModule } from '@nestjs/testing';
import { SearchedIdentitiesController } from './searched_identities.controller';
import { SearchedIdentitiesService } from './searched_identities.service';

describe('SearchedIdentitiesController', () => {
  let controller: SearchedIdentitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchedIdentitiesController],
      providers: [SearchedIdentitiesService],
    }).compile();

    controller = module.get<SearchedIdentitiesController>(SearchedIdentitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
