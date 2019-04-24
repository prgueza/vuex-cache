"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cachedResponseBuilder;

// Formats a mocked response from request configuration using cached data and user settings
function cachedResponseBuilder(config) {
  const data = config.cachedResponse.data,
        status = config.cachedResponseStatus,
        statusText = config.cachedResponseMessage;
  return {
    data,
    config,
    status,
    statusText
  };
}