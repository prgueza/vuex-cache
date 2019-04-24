// Formats a mocked response from request configuration using cached data and user settings
export default function cachedResponseBuilder(config) {
  const { cachedResponse: { data }, cachedResponseStatus: status, cachedResponseMessage: statusText } = config
  return { data, config, status, statusText }
}
