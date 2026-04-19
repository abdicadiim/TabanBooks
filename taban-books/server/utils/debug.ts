/**
 * Debug Utility
 * Centralized debug logging with JSON format
 * Enable/disable via DEBUG environment variable or server config
 */

interface DebugConfig {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logDatabase: boolean;
}

// Get debug configuration from environment or default to false
const getDebugConfig = (): DebugConfig => {
  const debugEnv = process.env.DEBUG || 'false';
  const debugEnabled = debugEnv === 'true' || debugEnv === '1' || debugEnv === 'yes';
  
  return {
    enabled: debugEnabled,
    logRequests: process.env.DEBUG_REQUESTS === 'true' || debugEnabled,
    logResponses: process.env.DEBUG_RESPONSES === 'true' || debugEnabled,
    logErrors: process.env.DEBUG_ERRORS === 'true' || debugEnabled,
    logDatabase: process.env.DEBUG_DATABASE === 'true' || debugEnabled,
  };
};

let config: DebugConfig = getDebugConfig();

/**
 * Update debug configuration
 */
export const setDebugConfig = (newConfig: Partial<DebugConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Get current debug configuration
 */
export const getConfig = (): DebugConfig => {
  return { ...config };
};

/**
 * Enable debug mode
 */
export const enableDebug = (): void => {
  config.enabled = true;
  console.log('🔍 Debug mode ENABLED');
};

/**
 * Disable debug mode
 */
export const disableDebug = (): void => {
  config.enabled = false;
  console.log('🔍 Debug mode DISABLED');
};

/**
 * Check if debug is enabled
 */
export const isDebugEnabled = (): boolean => {
  return config.enabled;
};

/**
 * Log request information
 */
export const logRequest = (req: any, additionalData?: Record<string, any>): void => {
  if (!config.enabled || !config.logRequests) return;

  const logData = {
    type: 'REQUEST',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer ***' : undefined,
      'user-agent': req.headers['user-agent'],
    },
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    user: req.user || undefined,
    ip: req.ip || req.connection?.remoteAddress,
    ...additionalData,
  };

  console.log(JSON.stringify(logData, null, 2));
};

/**
 * Log response information
 */
export const logResponse = (req: any, res: any, data?: any, additionalData?: Record<string, any>): void => {
  if (!config.enabled || !config.logResponses) return;

  const logData = {
    type: 'RESPONSE',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: res.responseTime || undefined,
    data: data ? (typeof data === 'object' ? data : { value: data }) : undefined,
    ...additionalData,
  };

  console.log(JSON.stringify(logData, null, 2));
};

/**
 * Log error information
 */
export const logError = (error: any, context?: Record<string, any>): void => {
  if (!config.enabled || !config.logErrors) return;

  const logData = {
    type: 'ERROR',
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode || error.status,
    },
    context: context || {},
  };

  console.log(JSON.stringify(logData, null, 2));
};

/**
 * Log database operations
 */
export const logDatabase = (operation: string, data?: any, additionalData?: Record<string, any>): void => {
  if (!config.enabled || !config.logDatabase) return;

  const logData = {
    type: 'DATABASE',
    timestamp: new Date().toISOString(),
    operation,
    data: data ? (typeof data === 'object' ? data : { value: data }) : undefined,
    ...additionalData,
  };

  console.log(JSON.stringify(logData, null, 2));
};

/**
 * Log general debug information
 */
export const logDebug = (message: string, data?: any): void => {
  if (!config.enabled) return;

  const logData = {
    type: 'DEBUG',
    timestamp: new Date().toISOString(),
    message,
    data: data ? (typeof data === 'object' ? data : { value: data }) : undefined,
  };

  console.log(JSON.stringify(logData, null, 2));
};

/**
 * Middleware to log requests and responses
 */
export const debugMiddleware = (req: any, res: any, next: any): void => {
  if (!config.enabled || !config.logRequests) {
    return next();
  }

  const startTime = Date.now();

  // Log request
  logRequest(req);

  // Override res.json to log responses
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    res.responseTime = `${Date.now() - startTime}ms`;
    logResponse(req, res, data);
    return originalJson(data);
  };

  // Override res.send to log responses
  const originalSend = res.send.bind(res);
  res.send = function (data: any) {
    res.responseTime = `${Date.now() - startTime}ms`;
    logResponse(req, res, data);
    return originalSend(data);
  };

  next();
};

export default {
  enableDebug,
  disableDebug,
  isDebugEnabled,
  getConfig,
  setDebugConfig,
  logRequest,
  logResponse,
  logError,
  logDatabase,
  logDebug,
  debugMiddleware,
};

