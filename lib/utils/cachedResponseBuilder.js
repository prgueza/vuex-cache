"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cachedResponseBuilder;

// Formats a mocked response from request configuration using cached data and user settings
function cachedResponseBuilder(config, fallback) {
  const data = config.cachedResponse.data,
        cachedResponseStatus = config.cachedResponseStatus,
        cachedResponseMessage = config.cachedResponseMessage,
        fallbackResponseMessage = config.fallbackResponseMessage,
        fallbackResponseStatus = config.fallbackResponseStatus;
  return {
    data,
    config,
    status: fallback ? fallbackResponseStatus : cachedResponseStatus,
    statusText: fallback ? fallbackResponseMessage : cachedResponseMessage
  };
}