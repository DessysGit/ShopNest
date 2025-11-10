/**
 * Keep-Alive Utility for ShopNest
 * 
 * Automatically pings the backend every 5 minutes to prevent
 * Render free tier from sleeping due to inactivity.
 * 
 * Works alongside UptimeRobot for redundant keep-alive protection.
 */

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const PING_TIMEOUT = 10000; // 10 seconds timeout

let pingInterval = null;
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

/**
 * Start automatic keep-alive pings
 */
export const startKeepAlive = () => {
  // Don't start if already running
  if (pingInterval) {
    console.log('⚠️ Keep-alive already running');
    return;
  }
  
  // Only run in production (not local development)
  if (import.meta.env.DEV) {
    console.log('⏸️ Keep-alive disabled in development mode');
    return;
  }

  // Don't run if no backend URL
  if (!BACKEND_URL) {
    console.warn('⚠️ No backend URL configured for keep-alive');
    return;
  }

  console.log('🏓 Starting keep-alive service...');
  console.log(`   Backend: ${BACKEND_URL}`);
  console.log(`   Interval: ${PING_INTERVAL / 1000 / 60} minutes`);
  
  // Ping immediately on start
  pingBackend();
  
  // Then ping every 5 minutes
  pingInterval = setInterval(() => {
    pingBackend();
  }, PING_INTERVAL);
};

/**
 * Stop automatic pings (cleanup)
 */
export const stopKeepAlive = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    consecutiveFailures = 0;
    console.log('⏹️ Keep-alive service stopped');
  }
};

/**
 * Ping the backend health endpoint
 */
const pingBackend = async () => {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);
    
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'X-Keep-Alive': 'frontend'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      consecutiveFailures = 0; // Reset failure counter
      console.log(`🏓 Keep-alive ping successful (${duration}ms)`, data);
    } else {
      handlePingFailure('HTTP error', response.status);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      handlePingFailure('Timeout', 'exceeded 10s');
    } else {
      handlePingFailure('Network error', error.message);
    }
  }
};

/**
 * Handle ping failures with smart retry logic
 */
const handlePingFailure = (type, details) => {
  consecutiveFailures++;
  console.log(`🏓 Keep-alive ping failed (${type}): ${details}`);
  
  if (consecutiveFailures >= MAX_FAILURES) {
    console.warn(`⚠️ ${MAX_FAILURES} consecutive failures. Backend might be down or sleeping.`);
    // Don't stop pinging - let it keep trying to wake up the backend
  }
};

/**
 * Manual ping trigger (useful for testing)
 */
export const manualPing = async () => {
  console.log('🏓 Manual ping triggered...');
  await pingBackend();
};

// Auto-start when imported (only in browser environment)
if (typeof window !== 'undefined') {
  // Start immediately
  startKeepAlive();
  
  // Also ping when tab becomes visible (user returns)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !import.meta.env.DEV) {
      console.log('👀 Tab visible - sending keep-alive ping');
      pingBackend();
    }
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', stopKeepAlive);
  
  // Log status
  console.log('✅ Keep-alive service initialized');
}

export default {
  start: startKeepAlive,
  stop: stopKeepAlive,
  ping: manualPing
};
