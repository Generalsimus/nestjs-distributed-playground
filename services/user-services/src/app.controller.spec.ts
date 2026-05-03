import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getUser', () => {
    it('should return a user with the requested userId', () => {
      const result = appController.getUser({ userId: '123' });
      expect(result).toMatchObject({ user: { userId: '123' } });
    });
  });
});
