/**
 * Configuration - Dynamically set based on environment
 * For production: uses current origin
 * For development: can be overridden via window.BINGO_CONFIG
 */
const url = window.BINGO_CONFIG?.BASE_URL || window.location.origin;
