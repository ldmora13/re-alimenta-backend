import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryEventsService } from './delivery_events.service.js';

describe('DeliveryEventsService', () => {
  let service: DeliveryEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryEventsService],
    }).compile();

    service = module.get<DeliveryEventsService>(DeliveryEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
