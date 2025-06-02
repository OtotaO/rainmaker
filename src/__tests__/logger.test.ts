import { Logger } from '../utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpies: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    logger = Logger.getInstance();
    consoleSpies = {
      debug: jest.spyOn(console, 'debug'),
      info: jest.spyOn(console, 'info'),
      warn: jest.spyOn(console, 'warn'),
      error: jest.spyOn(console, 'error'),
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
    expect(consoleSpies.error).toHaveBeenCalledWith(expect.stringContaining('error message'));
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
    
    expect(consoleSpies.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] test message'),
      expect.objectContaining({ data: 123 })
    );
  });

  it('should handle undefined log level', () => {
    logger.setLogLevel(undefined);
    logger.info('test message');
    
    expect(consoleSpies.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] test message')
    );
  });
}); 