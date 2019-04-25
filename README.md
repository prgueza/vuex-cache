# @pedro-rodalia/cache

[![npm](https://img.shields.io/npm/v/@pedro-rodalia/vuex-cache.svg)](https://github.com/pedro-rodalia/vuex-cache)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/@pedro-rodalia/vuex-cache.svg)](https://github.com/pedro-rodalia/vuex-cache)

Configurable Vue cache plugin for axios using the vuex store.

## Install

Install the package using npm and save it as a dependency.

```
$ npm install --save @pedro-rodalia/cache
```

## Basic usage

The cache vuex plugin uses axios interceptors and adapters in order to implement a cache system, so it needs an axios instance for it to work. The axios instance is passed as the first argument to the plugin initialization function. If there is no second argument specifying custom settings, it will run using the default settings.

```js
// Import cache package
import cache from '@pedro-rodalia/cache'

// Create an axios instance where the cache will be implemented
const axiosInstance = axios.create(axios.defaults)

// Initialize Vuex plugin using the created instance and default settings
const cachePlugin = cache(axiosInstance)

// Use the plugin within the store
export const store = new Vuex.Store({
  plugins: [
    cachePlugin,
    ...
  ],
  modules: {
    ...
  }
})
```

## Default global settings

By default, the plugin is configured to cache only `'get'` requests for every request that uses the axios instance. It stores the response for `60` seconds and has the `garbageCollector` set to `false` so the store will not clean itself up after a response is outdated.

It will try to `fallback` to cached responses on internal server errors (500) and return responses with a `304` status and a `'Not modified'` message for cached responses and `'Fallback result'` for fallback responses.

## Documentation

- [Using custom global settings](#using-custom-global-settings)
  - [Global settings](#global-settings)
    - [`methods` and `endpoints`](#methods-and-endpoints)
    - [`ttl`](#ttl)
    - [`garbageCollector`](#garbagecollector)
    - [`fallback`](#fallback)
    - [`cachedResponseStatus` and `cachedResponseMessage`](#cachedresponsestatus-and-cachedresponsemessage)
    - [`fallbackResponseStatus` and `cachedResponseMessage`](#fallbackresponsestatus-and-fallbackresponsemessage)
- [Using custom request settings](#using-custom-request-settings)
  - [Creating groups (`groups`)](#creating-groups-(groups))
  - [Clearing groups (`clear`)](#clearing-groups-(clear))

## Using custom global settings

An object specifying custom settings can be passed as a second argument. This settings will override the default settings.

```js
// Declare a configuration object
const config = {
  methods: ['get', 'post'],
  endpoints: [{
    endpoint: '/users',
    methods: ['get', 'post'],
    exact: true
  }],
  ttl: 120,
  garbageCollector: false,
  fallback: [400, 500],
  cachedResponseStatus: 304,
  cachedResponseMessage: 'This is a cached response',
  fallbackResponseStatus: 304,
  fallbackResponseMessage: 'This is a fallback response'
}

// Initialize Vuex plugin using the created instance and custom settings
const cachePlugin = cache(axiosInstance, config)
```

### Global settings

The custom configuration object can have the following properties.

| Name | Type | Default | Description |
| :------------- | :------------- | :------------- | :------------- |
| `methods` | `array` | `['get']` | Defines a list of methods for which the responses will be cached |
| `endpoints` | `array/object` | `[]` | Defines a list of endpoints for which the responses will be cached / Defines an object with key/value pairs defining both the endpoint and the methods for the requests that will be cached |
| `ttl` | `number` | `60` | Determines for how long a cached response is considered valid |
| `garbageCollector` | `boolean` | `false` | If set to true responses will clean themselves up after they are no longer valid responses (`ttl` seconds have passed) |
| `fallback` | `array` | `[500]` | Determines whether to answer a request with an outdated cached response if the request has returned an error. By default it only has this behaviour for INTERNAL SERVER ERROR (500) errors. |
| `cachedResponseStatus` | `number` | `304` | Determines the http status code for the cached response |
| `cachedResponseMessage` | `string` | `'Not Modified'` | Determines the status message for the cached response |
| `fallbackResponseStatus` | `number` | `cachedResponseStatus` | Determines the http status code for the outdated cached responses used with the `fallback` feature |
| `fallbackResponseMessage` | `string` | `'Fallback result'` | Determines the status message for the outdated cached responses used with the `fallback` feature |

- #### `methods` and `endpoints`

By default the plugin will cache only get requests and only if the `endpoints` property is not set. If we set the `endpoints` property for caching a specific method/endpoint request, and we still want to cache all the 'get' requests for the other endpoints, the `methods` property must be set manually and passed as a custom configuration.

```js
// This configuration will cache all 'get' requests (default config)
const config = {}

// This configuration will cache all 'get' and 'post' requests
const config = {
  methods: ['get', 'post']
}

// This configuration will ONLY cache 'get' requests for the users endpoint
const config = {
  endpoints: [{
    endpoint: '/users',
    methods: ['get']
  }]
}

// This configuration will cache 'get' requests for the users endpoint and 'get' and 'post'
// requests for any other endpoint
const config = {
  methods: ['get', 'post'], // Set manually as custom config
  endpoints: [{
    endpoint: '/users',
    methods: ['get']
  }]
}
```

When the `endpoints` setting is set the plugin will cache the responses from endpoints that match the endpoint property of each object within the setting. If we want to catch endpoints that exactly match this property, the match property must be set to true.

For example, if the `/users` endpoint returns a list of users and the `/users/:id` endpoint returns details about a specific user, we can cache just the list service which returns basic data unlikely to change, but still ask the server for the details.

```js
// This configuration will cache get requests for the /users endpoint and
// the /users/:id endpoints
const config = {
  endpoitns: [{
    endpoint: '/users',
    methods: ['get']
  }]
}

// This configuration will ONLY cache get requests for the /users endpoint and
// not for the specific /users/:id endpoints
const config = {
  endpoitns: [{
    endpoint: '/users',
    methods: ['get'],
    exact: true
  }]
}
```

- #### `ttl`

The `ttl` property specifies for how long a cached response is considered as valid. This means that if we make a request to an already cached endpoint, and `ttl` seconds haven't passed, the response will be the cached response from the previous request. On the other hand, if `ttl` seconds have passed, the response is considered outdated and the request is then resolved by the server.

If the `garbageCollector` property is set to `false`, outdated cached responses will be used as a valid response if the server returns any error included in the `fallback` configuration array.

```js
const config = {
  ttl: 120 // Manually set the ttl to 2 minutes
}
```

- #### `garbageCollector`

The `garbageCollector` property configures timers for the cached response to clean themselves up. Once their `ttl` has expired, the pair key/value for the response is deleted from the cache store. When `garbageCollector` is set to true the plugin won't test cached responses expiration date, but the `ttl` is still needed in order to configure the timers. If not set manually, responses will disappear after 60 seconds.

```js
const config = {
  ttl: 120, // seconds
  garbageCollector: true // Responses will be deleted after 2 minutes
}
```

- #### `fallback`

The `fallback` property is used to determine a list of [http status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) for which the response will try to return a cached response for that endpoint if it has been stored previously. If the `garbageCollector` is set to true this feature will not work, because outdated responses are deleted and the only way to ask the service for a new response before the cached one has been deleted would be forcing the request using the `reload` request configuration. When forcing the reload it doesn't make much sense to return cached data, which could lead to confusion.

By default, internal server errors (500) will try to fallback to cached data.

```js
// Use the fallback feature for internal server (500) errors and not found (404) errors
const config = {
  fallback: [500, 404]
}

// disable the fallback feature
const config {
  fallback: []
}
```

- #### `cachedResponseStatus` and `cachedResponseMessage`

This properties define the status code and status message for cached responses. By default is set to return a response with the `304` status code and a `'Not modified'` message, but can be configured to any other values.

```js
// Use this configuration to make the cache system transparent
const config = {
  cachedResponseStatus: 200,
  cachedResponseMessage: 'OK'
}
```

- #### `fallbackResponseStatus` and `fallbackResponseMessage`

This properties define the status code and status message for responses used by the `fallback` feature. By default is set to return a response with the `cachedResponseStatus` code and a `'Fallback result'` message, but can be configured to any other values.

```js
// Use this configuration to make the cache system transparent
const config = {
  fallbackResponseStatus: 200,
  fallbackResponseMessage: 'OK'
}
```

## Using custom request settings

:construction: Axios request configuration can be set as usual, but it's not fully tested so some configurations might interfere with the plugin.

Most of the **global properties** can be set within the request configuration object and would provide the same functionality for that specific request.

| Name | Type | Default (from global) | Description |
| :------------- | :------------- | :------------- | :------------- |
| `ttl` | `number` | `ttl` | Determines for how long a cached response is considered valid |
| `garbageCollector` | `boolean` | `garbageCollector` | If set to true responses will clean themselves up after they are no longer valid responses (`ttl` seconds have passed) |
| `fallback` | `array` | `fallback` | Determines whether to answer a request with an outdated cached response if the request has returned an error. By default it only has this behaviour for INTERNAL SERVER ERROR (500) errors. |
| `cachedResponseStatus` | `number` | `cachedResponseStatus` | Determines the http status code for the cached response |
| `cachedResponseMessage` | `string` | `cachedResponseMessage` | Determines the status message for the cached response |
| `fallbackResponseStatus` | `number` | `cachedResponseStatus` | Determines the http status code for the outdated cached responses used with the `fallback` feature |
| `fallbackResponseMessage` | `string` | `fallbackResponseStatus` | Determines the status message for the outdated cached responses used with the `fallback` feature |

There are two more configuration options for specific requests which help manage the cache status.

#### Creating groups (`groups`)

Requests can be grouped under a unique identifier using the `group` property. This will save a reference to the cachedResponses that belong to the same group, so they can be deleted easily when needed.

This is useful because sometimes we want a specific request that modifies data in the server to clear any related cached response which would contain outdated data.

In order to achieve this we would group all the related requests under the same group. Requests can belong to multiple teams at once.

```js
// Request configuration
const requestConfiguration = { groups: ['users'] }

// Use this configuration within multiple requests
api.get('/users', requestConfiguration).then()
api.get('/users/:id', requestConfiguration).then()
```

#### Clearing groups (`clear`)

If we want to clear requests that belong to a specific group when we make a different request, the `clear` setting must specify a list of groups we want to be cleared.

For instance, if we ask the server for a list of users that we think might have changed (using the `reload` setting), we probably want the cache to remove all the cached responses for the individual users. This way, when afterwards we ask for a specific user, we get fresh data from the server.

```js
// Request configuration
const requestConfiguration = { reload: true, clear: ['users'] }

// Clear the 'users' group
api.get('/users', requestConfiguration).then()

// Get fresh data from the server
api.get('/users/:id').then()
```

*The request that triggers this setting doesn't necessary need to belong to the groups it clears.*
