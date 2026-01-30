// src/utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  enableInProduction: boolean;
  enablePerformanceLogs: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    const isDev = import.meta.env.DEV;
    
    // Allow enabling logs via localStorage for debugging production
    const debugMode = typeof window !== 'undefined' && 
      localStorage.getItem('sundial-debug') === 'true';
    
    this.config = {
      enabled: isDev || debugMode,
      level: (localStorage.getItem('sundial-log-level') as LogLevel) || 'debug',
      enableInProduction: debugMode,
      enablePerformanceLogs: isDev || debugMode,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled && !this.config.enableInProduction) {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, ...args: any[]): any[] {
    const prefix = `[${level.toUpperCase()}]`;
    return [prefix, ...args];
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(...this.formatMessage('debug', ...args));
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', ...args));
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', ...args));
    }
  }

  error(...args: any[]): void {
    // Always log errors, even in production
    console.error(...this.formatMessage('error', ...args));
  }

  // Performance logging (for React.Profiler)
  perf(component: string, phase: string, duration: number): void {
    if (this.config.enablePerformanceLogs && this.shouldLog('debug')) {
      console.log(`[PERF] ${component} ${phase}: ${duration.toFixed(1)}ms`);
    }
  }

  // Grouped logging for complex operations
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  // Conditional logging - only in dev
  devOnly(...args: any[]): void {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  }

  // Update config at runtime (useful for debugging)
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for direct use
export const log = {
  debug: (...args: any[]) => logger.debug(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
  perf: (component: string, phase: string, duration: number) => 
    logger.perf(component, phase, duration),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
  devOnly: (...args: any[]) => logger.devOnly(...args),
};
