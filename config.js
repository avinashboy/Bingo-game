/**
 * Configuration Constants for Bingo Game
 * Following the 4 Pillars: Readability, Maintainability, Scalability, Performance
 */

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,

  // Game Room Configuration
  ROOM: {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 6,
    IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Check every 5 minutes
  },

  // Game Configuration
  GAME: {
    GRID_SIZE: 5,
    MAX_NUMBER: 25,
    STRIKES_TO_WIN: 5,
  },

  // Performance Configuration
  PERFORMANCE: {
    ENABLE_DOM_FRAGMENT: true,
    ENABLE_NUMBER_HASHMAP: true,
    DEBOUNCE_MS: 100,
  },

  // Client Configuration (exposed to frontend)
  CLIENT_CONFIG: {
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY_MS: 1000,
  }
};
