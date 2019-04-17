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

The cache vuex plugin uses axios interceptors and adapters in order to implement a cache system, so it needs an axios instance in order to work. The axios instance will be passed as the first parameter to the plugin initialization function. If there is no second parameter specifying custom settings, it will run using the default settings.

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
