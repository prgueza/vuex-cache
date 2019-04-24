import stringHash from 'string-hash'
import moment from 'moment'
import isCached from './utils/isCached.js'
import cachedResponseBuilder from './utils/cachedResponseBuilder.js'

/* CACHE PLUGIN */
export default function cachePlugin (instance, customSettings) {
  return store => {

    /* AXIOS INSTANCE HELPER FUNCTIONS */

    // Axios adapter function that simulates the server responding with cached data
    const Adapter = (config) => {
      const { data } = config.cachedResponse
      return Promise.resolve(cachedResponseBuilder(config))
    }

    // Axios interceptor function that checks if the request is cached
    const RequestInterceptor = (config) => {
      const { method, url, baseURL, clean, garbageCollector: localgarbageCollector, data, reload } = config
      const { methods, endpoints, cache, garbageCollector: globalgarbageCollector } = store.getters
      const garbageCollector = localgarbageCollector === undefined ? globalgarbageCollector : localgarbageCollector
      // If the clean setting is set in the config, clean up cache before making the request
      if (clean) store.dispatch('clean', { clean })
      // If the request could've been cached
      if (isCached(methods, endpoints, config)) {
        config.cache = true // Set cache to true so the response gets stored
        const key = stringHash(baseURL + url + JSON.stringify(data))
        const cachedResponse = cache[key] // Look for the cached response
        if (!reload && cachedResponse && (garbageCollector || moment(cachedResponse.expires).isAfter(moment()))) {
          config.cachedResponse = cachedResponse // Store cached response in config
          config.adapter = Adapter // Set the adapter to return the cached response
          config.cache = false // Set cache to false so the response interceptor doesn't re-store the response data
        }
      }
      return config
    }

    // Axios interceptor functions that caches the response from the server
    const ResponseInterceptor = (response) => {
      const { config: { cache, baseURL, url, data: body, reload }, config, data, status } = response
      if (!reload && store.getters.fallback.includes(status)) {
        const key = stringHash(baseURL + url + JSON.stringify(body))
        const cachedResponse = cache[key] // Look for the cached response
        if (cachedResponse) {
          config.cachedResponse = cachedResponse
          response = cachedResponseBuilder(config, true)
        }
      } else if (cache) {
        store.dispatch('cache', { config, data }) // Cache the response
      }
      return response
    }

    /* AXIOS INSTANCE CONFIGURATION */
    const {
      cachedResponseStatus = 304,
      cachedResponseMessage = 'Not modified',
      fallbackResponseMessage = 'Fallback result',
      fallbackResponseStatus,
    } = customSettings || {}

    instance.defaults.cache = false // Calls are not cached by default
    instance.defaults.cachedResponseStatus = cachedResponseStatus
    instance.defaults.cachedResponseMessage = cachedResponseMessage
    instance.defaults.fallbackResponseStatus = fallbackResponseStatus || cachedResponseStatus
    instance.defaults.fallbackResponseMessage = fallbackResponseMessage
    instance.defaults.groups = []
    instance.interceptors.request.use(RequestInterceptor)
    instance.interceptors.response.use(ResponseInterceptor)

    /* CACHE DEFAULT SETTINGS */
    const defaultSettings = {
      methods: ['get'],
      endpoints: [],
      garbageCollector: false,
      fallback: [500],
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
        garbageCollector: (state) => state.garbageCollector,
        fallback: (state) => state.fallback,
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
          const { groups = [] } = state.cache[key]
          groups.map(group => {
            state.groups[group] = state.groups[group].filter(el => el !== key)
            if (state.groups[group].length === 0) delete state.groups[group]
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
          const { groups = [], url, data: body } = config
          const groupsArray = Object.values(groups)
          const garbageCollector = config.garbageCollector || getters.garbageCollector // Custom or default garbage colector
          const ttl = config.ttl || getters.ttl // Custom or default ttl
          const key = stringHash(url + body)
          const garbageCollectorId = getters.cache[key] && getters.cache[key].garbageCollectorId // If the call is already cached
          if (garbageCollectorId) clearTimeout(garbageCollectorId) // Unset the timeout
          const value = {
            data,
            body,
            garbageCollectorId: garbageCollector && setTimeout(() => { commit('DELETE_FROM_CACHE', { key }) }, ttl),
            endpoint: config.url,
            groups: groupsArray,
            expires: moment().add(ttl, 'milliseconds').format(),
            timestamp: moment().format()
          }
          groupsArray.map(group => {
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
              const { garbageCollectorId } = getters.call(key)
              if (garbageCollectorId) clearTimeout(garbageCollectorId) // Unset the timeout
              commit('DELETE_FROM_CACHE', { key }) // Delete responses
            })
            commit('DELETE_GROUP', { name }) // Delete the group
          })
        }
      }
    })
  }
}
