/**
 * Remote Logger Utility for Nexo SGFM
 * Sends frontend errors and debug info to the server's logs/server.log
 */

interface LogData {
  level: 'INFO' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
}

export const remoteLog = async ({ level, message, data }: LogData) => {
  try {
    await fetch('/api/logs/remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        data,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  } catch (e) {
    // Fallback to console if server is unreachable
    console.error('Failed to send remote log', e);
  }
};

export const logError = (message: string, error?: any) => {
  console.error(message, error);
  remoteLog({ level: 'ERROR', message, data: { error: error?.message || error, stack: error?.stack } });
};

export const logInfo = (message: string, data?: any) => {
  console.log(message, data);
  remoteLog({ level: 'INFO', message, data });
};
