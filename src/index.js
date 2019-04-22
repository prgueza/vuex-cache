import stringHash from 'string-hash'
import moment from 'moment'

/* CACHE PLUGIN */
export default function cachePlugin (instance, customSettings) {
  return store => {
    /* AXIOS INSTANCE HELPER FUNCTIONS */
    // Axios adapter function that simulates the server responding with cached data
    const Adapter = (config) => {
      const { data } = config.cachedResponse
      return Promise.resolve({
        data,
        config,
        status: 304,
        statusText: 'Not Modified'
      })
    }
    // Axios interceptor function that checks if the request is cached
    const RequestInterceptor = (config) => {
      const { method, url, baseURL, clean, garbageColector, data: body } = config
      if (clean) { // If the clean setting is set in the config, clean up cache before making the request
        store.dispatch('clean', { clean })
      }
      // If the request could've been cached
      const cacheIsTrue = config.cache
      const matchesMethod = store.getters.methods.includes(method)
      const matchesEndpoint = store.getters.endpoints.length === 0 || store.getters.endpoints.includes(url)
      if (cacheIsTrue || (matchesMethod && matchesEndpoint)) {
        const key = stringHash(baseURL + url + JSON.stringify(body))
        const responseIsCached = store.getters.cache.hasOwnProperty([key]) // Look for the cached response
        if (responseIsCached) { // If the response is stored in cache
          const cachedResponse = store.getters.cache[key] // get cachedResponse
          if (moment(cachedResponse.expires).isAfter(moment())) { // If it hasn't expired or autodestroy is set
            config.cachedResponse = cachedResponse // Store cached response in config
            config.adapter = Adapter // Set the adapter to return the cached response
            config.cache = false // Set cache to false so the response interceptor doesn't re-store the response data
            return config
          }
        }
        config.cache = true // Set cache to true so the response gets stored
        return config
      }
      // If the response is not supposed to be cached
      return config
    }
    // Axios interceptor functions that caches the response from the server
    const ResponseInterceptor = (response) => {
      const { config, data } = response
      if (config.cache) { // If the request was configured to be cached
        store.dispatch('cache', { config, data }) // Cache the response
        return response
      } else { // If the request wasn't configured to be cached just return the response
        return response
      }
    }

    /* AXIOS INSTANCE CONFIGURATION */
    instance.defaults.cache = false // Calls are not cached by default
    instance.defaults.groups = []
    instance.interceptors.request.use(RequestInterceptor)
    instance.interceptors.response.use(ResponseInterceptor)

    /* CACHE DEFAULT SETTINGS */
    const defaultSettings = {
      methods: ['post', 'get'],
      endpoints: [],
      garbageColector: true, // Remove old calls automatically
      ttl: 60 // Default cache time to live in seconds
    }

    // Set user custom settings
    const settings = Object.assign(defaultSettings, customSettings)

    /* LOAD VUEX MODULE */
    store.registerModule('cache', {
      state: {
        cache: {},
        groups: {},
        ...settings
      },
      getters: {
        cache: (state) => state.cache,
        call: (state) => (key) => state.cache[key],
        groups: (state) => state.groups,
        group: (state) => (key) => state.groups[key],
        methods: (state) => state.methods,
        endpoints: (state) => state.endpoints,
        garbageColector: (state) => state.garbageColector,
        ttl: (state) => state.ttl * 1000 // Convert to ms
      },
      mutations: {
        SET_OPTIONS (state, { key, value }) {
          state[key] = value
        },
        SET_CACHE (state, { key, value }) {
          state.cache[key] = value
        },
        DELETE_FROM_CACHE (state, { key }) {
          const { groups } = state.cache[key]
          groups && groups.map(group => {
            state.groups[group] = state.groups[group].filter(el => el !== key)
            if (state.groups[group].length < 0) delete state.groups[group]
          })
          delete state.cache[key]
        },
        SET_GROUP (state, { group, key }) {
          state.groups[group] = [key]
        },
        UPDATE_GROUP (state, { group, key }) {
          state.groups[group].push(key)
        },
        DELETE_GROUP (state, { group }) {
          delete state.groups[group]
        }
      },
      actions: {
        deleteFromCache ({ commit }, key) {
          commit('DELETE_FROM_CACHE', { key })
        },
        cache ({ commit, getters }, payload) {
          const { config, data } = payload
          const { groups, url, data: body } = config
          const groupsArray = Object.values(groups)
          const garbageColector = config.garbageColector || getters.garbageColector // Custom or default garbage colector
          const ttl = config.ttl || getters.ttl // Custom or default ttl
          const key = stringHash(url + body)
          const garbageColectorId = getters.cache[key] && getters.cache[key].garbageColectorId // If the call is already cached
          garbageColectorId && (clearTimeout(garbageColectorId)) // Unset the timeout
          const value = {
            data,
            body,
            garbageColectorId: garbageColector && setTimeout(() => { commit('DELETE_FROM_CACHE', { key }) }, ttl),
            endpoint: config.url,
            groups: groupsArray,
            expires: moment().add(ttl, 'milliseconds').format(),
            timestamp: moment().format()
          }
          groupsArray && groupsArray.map(group => {
            getters.group(group) && getters.group(group).length > 0
              ? commit('UPDATE_GROUP', { group, key })
              : commit('SET_GROUP', { group, key })
          })
          commit('SET_CACHE', { key, value })
        },
        clean ({ state, commit, getters }, payload) {
          const { clean: groupNames } = payload // Groups with related calls to be deleted
          const { group } = getters // Existing groups within the cache system
          groupNames.forEach(name => {
            group(name) && group(name).forEach(key => {
              const { garbageColectorId } = getters.call(key)
              garbageColectorId && (clearTimeout(garbageColectorId)) // Unset the timeout
              commit('DELETE_FROM_CACHE', { key }) // Delete response
            })
            commit('DELETE_GROUP', { name }) // Delete the group
          })
        }
      }
    })
  }
}
