import { PrismaClient } from '.prisma/client';
import { ConfigSettingService, ConfigSettingError } from '../config/configSettingService';
import { logger } from '../lib/logger';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger to prevent test output noise
vi.mock('../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Prisma
vi.mock('.prisma/client', () => {
  const mockCreate = vi.fn();
  const mockFindUnique = vi.fn();
  
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      configSetting: {
        create: mockCreate,
        findUnique: mockFindUnique
      }
    }))
  };
});

describe('ConfigSettingService', () => {
  let prisma: PrismaClient;
  let service: ConfigSettingService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    service = new ConfigSettingService(prisma);
  });
  
  describe('createConfigSetting', () => {
    it('should create a valid config setting with string value', async () => {
      const mockData = {
        key: 'test-key',
        value: 'test-value',
        category: 'test-category',
        isEncrypted: false,
        version: 1
      };
      
      const mockResult = {
        id: 'generated-uuid',
        key: 'test-key',
        value: 'test-value',
        category: 'test-category',
        description: null,
        isEncrypted: false,
        lastModified: new Date(),
        version: 1
      };
      
      (prisma.configSetting.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
      (prisma.configSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      
      const result = await service.createConfigSetting(mockData);
      
      expect(prisma.configSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'test-key' }
      });
      
      expect(prisma.configSetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'test-key',
          value: 'test-value',
          category: 'test-category'
        })
      });
      
      expect(result).toHaveProperty('id', 'generated-uuid');
      expect(result).toHaveProperty('key', 'test-key');
      expect(result).toHaveProperty('value', 'test-value');
      expect(result).toHaveProperty('version', 1);
    });
    
    it('should create a valid config setting with non-string value', async () => {
      const mockData = {
        key: 'boolean-key',
        value: true,
        category: 'test-category',
        isEncrypted: false,
        version: 1
      };
      
      const mockResult = {
        id: 'generated-uuid',
        key: 'boolean-key',
        value: 'true', // Stored as string in DB
        category: 'test-category',
        description: null,
        isEncrypted: false,
        lastModified: new Date(),
        version: 1
      };
      
      (prisma.configSetting.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
      (prisma.configSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      
      const result = await service.createConfigSetting(mockData);
      
      expect(prisma.configSetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'boolean-key',
          value: 'true' // JSON stringified boolean
        })
      });
      
      // Should parse back to boolean
      expect(result).toHaveProperty('value', true);
    });
    
    it('should throw error for duplicate key', async () => {
      const mockData = {
        key: 'existing-key',
        value: 'test-value',
        isEncrypted: false,
        version: 1
      };
      
      // Mock findUnique to return an existing setting
      (prisma.configSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'existing-uuid',
        key: 'existing-key',
        value: 'existing-value',
        isEncrypted: false,
        lastModified: new Date(),
        version: 1
      });
      
      await expect(service.createConfigSetting(mockData)).rejects.toThrow(ConfigSettingError);
      expect(prisma.configSetting.create).not.toHaveBeenCalled();
    });
    
    it('should throw error for empty key', async () => {
      const mockData = {
        key: '',
        value: 'test-value',
        isEncrypted: false,
        version: 1
      };
      
      await expect(service.createConfigSetting(mockData)).rejects.toThrow();
      expect(prisma.configSetting.findUnique).not.toHaveBeenCalled();
      expect(prisma.configSetting.create).not.toHaveBeenCalled();
    });
  });
  
  describe('getConfigSetting', () => {
    it('should retrieve an existing config setting', async () => {
      const mockResult = {
        id: 'test-uuid',
        key: 'test-key',
        value: 'test-value',
        description: null,
        category: null,
        isEncrypted: false,
        lastModified: new Date(),
        version: 1
      };
      
      (prisma.configSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
      
      const result = await service.getConfigSetting('test-key');
      
      expect(prisma.configSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'test-key' }
      });
      
      expect(result).toHaveProperty('key', 'test-key');
      expect(result).toHaveProperty('value', 'test-value');
    });
    
    it('should parse JSON values back to original type', async () => {
      const mockResult = {
        id: 'test-uuid',
        key: 'number-key',
        value: '42', // Stored as string in DB
        description: null,
        category: null,
        isEncrypted: false,
        lastModified: new Date(),
        version: 1
      };
      
      (prisma.configSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
      
      const result = await service.getConfigSetting('number-key');
      
      expect(result).toHaveProperty('value', 42); // Should be parsed back to number
    });
    
    it('should return null for non-existent key', async () => {
      (prisma.configSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      
      const result = await service.getConfigSetting('non-existent-key');
      
      expect(result).toBeNull();
    });
  });
});
