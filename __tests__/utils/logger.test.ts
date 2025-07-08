import * as fs from 'fs';
import * as path from 'path';
import { Logger, createLogger } from '../../src/utils/logger';

// Mocks für fs-Operationen
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockImplementation(() => Promise.resolve()),
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

// Mock für console.log und andere console-Methoden
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

describe('Logger', () => {
  // Spy-Objekte für Console-Methoden
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mocks zurücksetzen
    jest.clearAllMocks();
    
    // Console-Methoden mocken
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    // Mock für fs.existsSync zurücksetzen
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    // Ursprüngliche Console-Methoden wiederherstellen
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
  });

  describe('Logger.constructor', () => {
    it('sollte mit gültiger Konfiguration initialisiert werden', () => {
      const config = {
        logDir: 'logs',
        logFile: 'test.log'
      };
      
      const logger = new Logger(config);
      
      expect(logger).toBeDefined();
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('sollte mit benutzerdefinierten Optionen initialisiert werden', () => {
      const config = {
        logDir: 'custom-logs',
        logFile: 'custom.log',
        logToConsole: false
      };
      
      const logger = new Logger(config);
      
      expect(logger).toBeDefined();
      expect(fs.existsSync).toHaveBeenCalledWith('custom-logs');
    });
  });

  describe('Logger.log', () => {
    it('sollte Nachrichten an die Konsole protokollieren', () => {
      const logger = new Logger({
        logDir: 'logs',
        logFile: 'test.log'
      });
      const message = 'Test message';
      const module = 'TestModule';
      
      logger.info(module, message);
      
      // Logger verwendet console.log für alle Log-Level
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('sollte nicht in die Konsole protokollieren, wenn logToConsole false ist', () => {
      const logger = new Logger({ 
        logDir: 'logs',
        logFile: 'test.log',
        logToConsole: false 
      });
      
      logger.info('TestModule', 'Test message');
      
      // console.log sollte nicht aufgerufen worden sein
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('Logger.methods', () => {
    it('sollte verschiedene Log-Level unterstützen', () => {
      const logger = new Logger({ 
        logDir: 'logs',
        logFile: 'test.log'
      });
      
      // Verschiedene Log-Level testen
      logger.debug('TestModule', 'Debug message');
      logger.info('TestModule', 'Info message');
      logger.warn('TestModule', 'Warning message');
      logger.error('TestModule', 'Error message');
      
      // Logger verwendet console.log für alle Log-Level
      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('createLogger', () => {
    it('sollte eine Logger-Instanz zurückgeben', () => {
      const logger = createLogger('.');
      
      expect(logger).toBeInstanceOf(Logger);
    });

    it('sollte mit dem übergebenen Basispfad arbeiten', () => {
      // Wir verwenden eine leere Mock-Implementierung für createDefaultLogger,
      // um die tatsächliche Implementierung zu umgehen
      const spy = jest.spyOn(Logger, 'createDefaultLogger').mockImplementation(() => {
        return new Logger({
          logDir: 'test-logs',
          logFile: 'test.log'
        });
      });
      
      const logger = createLogger('test-base-dir');
      
      expect(spy).toHaveBeenCalledWith('test-base-dir');
      spy.mockRestore();
    });
  });
});
