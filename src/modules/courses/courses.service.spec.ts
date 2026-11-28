import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from './entities/course.entity.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('CoursesService', () => {
  let service: CoursesService;
  let repoMock: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repoMock = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findExistingOrThrow throws BadRequestException when course does not exist', async () => {
    repoMock.findOne.mockResolvedValueOnce(null);
    await expect(service.findExistingOrThrow('UNKNOWN')).rejects.toThrow(BadRequestException);
  });
});
