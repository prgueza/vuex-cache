// Returns true if a request needs to be cached or could be cached and false otherwise
import endpointsConfigurationFormat from './endpointsConfigurationFormat.js'

export default function isCached(methods, endpoints, { url, method, cache }) {
  // Check if cache has been set manually
  if (cache) return true
  // Check if endpoint property is valid and determine the format
  const format = endpointsConfigurationFormat(endpoints)
  // Diferenciate between formats
  switch (format) {
    case 'strings':
      // check if endpoint is included
      if (endpoints.some(endpoint => endpoint === url)) return true // if is set as a string it has to be cached regardless of the method
      break
      case 'objects':
      // check if endpoint is included and if so save the configuration for that endpoint
      const endpointConfig = endpoints.find(endpoint => endpoint.endpoint === url)
      if (!!endpointConfig && endpointConfig.methods.includes(method)) return true // If is set as an object and the method exists in the methods configuration array
      else if (!!endpointConfig) return false
      break
  }
  // Otherwise compare methods or check if no methods are set (which means we should cache all requests)
  return methods.includes(method) || methods.length === 0
}
