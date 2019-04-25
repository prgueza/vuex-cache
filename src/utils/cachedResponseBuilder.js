// Formats a mocked response from request configuration using cached data and user settings
export default function cachedResponseBuilder(config, fallback) {
  const { cachedResponse: { data }, cachedResponseStatus, cachedResponseMessage, fallbackResponseMessage, fallbackResponseStatus } = config
  return {
    data,
    config,
    status: fallback ? fallbackResponseStatus : cachedResponseStatus,
    statusText: fallback ? fallbackResponseMessage : cachedResponseMessage
  }
}
