import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryEventsController } from './delivery_events.controller.js';

describe('DeliveryEventsController', () => {
  let controller: DeliveryEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryEventsController],
    }).compile();

    controller = module.get<DeliveryEventsController>(DeliveryEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
