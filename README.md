# @pedro-rodalia/cache

[![npm](https://img.shields.io/npm/v/@pedro-rodalia/cache.svg)](https://github.com/pedro-rodalia/cache)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/@pedro-rodalia/cache.svg)](https://github.com/pedro-rodalia/cache)

Configurable Vue cache plugin for axios using the vuex store.

## Install

Install the package using npm and save it as a dependency.

```
$ npm install --save @pedro-rodalia/cache
```

## Basic usage

The cache vuex plugin uses axios interceptors and adapters in order to implement a cache system, so it needs an axios instance in order to work. The axios instance is passed as the first argument to the plugin initialization function. If there is no second argument specifying custom settings, it will run using the default settings.

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

## Default settings

By default, the plugin is configured to cache only 'get' requests for every request that uses the axios instance. It stores the response for 60 seconds and has the garbage colector set to true so the store will clean itself up after a response is outdated.

## Using custom settings

An object specifying custom settings can be passed as a second argument. This settings will override the default settings.

```js
// Declare a configuration object
const config = {
  methods: ['get', 'post'],
  ttl: 120,
  garbageColector: false,
  endpoints: [{
    endpoint: '/users',
    methods: ['get', 'post']
  }]
}

// Initialize Vuex plugin using the created instance and custom settings
const cachePlugin = cache(axiosInstance, config)
```

### Settings

The custom configuration object can have the following properties.

| Name | Type | Default | Description |
| :------------- | :------------- | :------------- | :------------- |
| `methods` | `array` | `['get']` | Defines a list of methods for which the responses will be cached |
| `ttl` | `number` | `60` | Determines for how long a cached response is considered valid |
| `garbageColector` | `boolean` | `true` | If set to true responses will clean themselves up after they are no longer valid responses (`ttl` seconds have passed) |
| `endpoints` | `array/object` | `[]` | Defines a list of endpoints for which the responses will be cached / Defines an object with key/value pairs defining both the endpoint and the methods for the requests that will be cached |
| `fallback` | `array` | `[500]` | Determines whether to answer a request with an outdated cached response if the request has returned an error. By default it only has this behaviour for INTERNAL SERVER ERROR (500) errors. |
| `cachedResponseStatus` | `number` | `304` | Determines the http status code for the cached response |
| `cachedResponseMessage` | `string` | `'Not Modified'` | Determines the status message for the cached response |

#### methods

By default the plugin will cache only get requests and only if the endpoints property is not set. If we set the endpoints property for caching a specific method/endpoint request, and we still want to cache all the 'get' requests for the other endpoints, the methods property must be set manually and passed as a custom configuration.

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

// This configuration will cache 'get' requests for the users endpoint and 'post' requests for any other endpoint
const config = {
  methods: ['get', 'post'], // Set manually as custom config
  endpoints: [{
    endpoint: '/users',
    methods: ['get']
  }]
}
```

#### ttl

The ttl property specifies for how long a cached response is considered as valid. This means that if we make a request to an already cached endpoint, and ttl seconds haven't passed, the response will be the cached response from the previous request. On the other hand, if ttl seconds have passed, the response is considered outdated and
