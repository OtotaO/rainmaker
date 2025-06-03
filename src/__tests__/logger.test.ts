import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpies: {
    debug: any;
    info: any;
    warn: any;
    error: any;
  };

  beforeEach(() => {
    logger = Logger.getInstance();
    consoleSpies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    Object.values(consoleSpies).forEach(spy => spy.mockRestore());
  });

  it('should be a singleton', () => {
    const logger2 = Logger.getInstance();
    expect(logger).toBe(logger2);
  });

  it('should respect log levels', () => {
    logger.setLogLevel('error');
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleSpies.debug).not.toHaveBeenCalled();
    expect(consoleSpies.info).not.toHaveBeenCalled();
    expect(consoleSpies.warn).not.toHaveBeenCalled();
    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    expect(consoleSpies.error).toHaveBeenCalledWith('[ERROR] error message');
  });

  it('should log all levels when set to debug', () => {
    logger.setLogLevel('debug');
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
    expect(consoleSpies.info).toHaveBeenCalledTimes(1);
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
  });

  it('should format messages correctly', () => {
    logger.setLogLevel('info');
    logger.info('test message', { data: 123 });
    
    expect(consoleSpies.info).toHaveBeenCalledWith('[INFO] test message', { data: 123 });
  });

  it('should handle undefined log level', () => {
    logger.setLogLevel(undefined);
    logger.info('test message');
    
    expect(consoleSpies.info).toHaveBeenCalledWith('[INFO] test message');
  });
});
