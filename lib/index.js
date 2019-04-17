"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cachePlugin;

var _stringHash = _interopRequireDefault(require("string-hash"));

var _moment = _interopRequireDefault(require("moment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/* CACHE PLUGIN */
function cachePlugin(instance, customSettings) {
  return store => {
    /* AXIOS INSTANCE HELPER FUNCTIONS */
    // Axios adapter function that simulates the server responding with cached data
    const Adapter = config => {
      const data = config.cachedResponse.data;
      return Promise.resolve({
        data,
        config,
        status: 304,
        statusText: 'Not Modified'
      });
    }; // Axios interceptor function that checks if the request is cached


    const RequestInterceptor = config => {
      const method = config.method,
            url = config.url,
            baseURL = config.baseURL,
            clean = config.clean,
            body = config.data;

      if (clean) {
        // If the clean setting is set in the config, clean up cache before making the request
        store.dispatch('clean', {
          clean
        });
      } // If the request could've been cached


      const cacheIsTrue = config.cache;
      const matchesMethod = store.getters.methods.includes(method);
      const matchesEndpoint = store.getters.endpoints.length === 0 || store.getters.endpoints.includes(url);

      if (cacheIsTrue || matchesMethod && matchesEndpoint) {
        const key = (0, _stringHash.default)(baseURL + url + JSON.stringify(body));
        const responseIsCached = store.getters.cache.hasOwnProperty([key]); // Look for the cached response

        if (responseIsCached) {
          // If the response is stored in cache
          const cachedResponse = store.getters.cache[key]; // get cachedResponse

          if ((0, _moment.default)(cachedResponse.expires).isAfter((0, _moment.default)())) {
            // If it hasn't expired
            config.cachedResponse = cachedResponse; // Store cached response in config

            config.adapter = Adapter; // Set the adapter to return the cached response

            config.cache = false; // Set cache to false so the response interceptor doesn't re-store the response data

            return config;
          }
        }

        config.cache = true; // Set cache to true so the response gets stored

        return config;
      } // If the response is not supposed to be cached


      return config;
    }; // Axios interceptor functions that caches the response from the server


    const ResponseInterceptor = response => {
      const config = response.config,
            data = response.data;

      if (config.cache) {
        // If the request was configured to be cached
        store.dispatch('cache', {
          config,
          data
        }); // Cache the response

        return response;
      } else {
        // If the request wasn't configured to be cached just return the response
        return response;
      }
    };
    /* AXIOS INSTANCE CONFIGURATION */


    instance.defaults.cache = false; // Calls are not cached by default

    instance.defaults.groups = [];
    instance.interceptors.request.use(RequestInterceptor);
    instance.interceptors.response.use(ResponseInterceptor);
    /* CACHE DEFAULT SETTINGS */

    const defaultSettings = {
      methods: ['post', 'get'],
      endpoints: [],
      garbageColector: true,
      // Remove old calls automatically
      ttl: 60 // Default cache time to live in seconds
      // Set user custom settings

    };
    const settings = Object.assign(defaultSettings, customSettings);
    /* LOAD VUEX MODULE */

    store.registerModule('cache', {
      state: _objectSpread({
        cache: {},
        groups: {}
      }, settings),
      getters: {
        cache: state => state.cache,
        call: state => key => state.cache[key],
        groups: state => state.groups,
        group: state => key => state.groups[key],
        methods: state => state.methods,
        endpoints: state => state.endpoints,
        garbageColector: state => state.garbageColector,
        ttl: state => state.ttl * 1000 // Convert to ms

      },
      mutations: {
        SET_OPTIONS(state, _ref) {
          let key = _ref.key,
              value = _ref.value;
          state[key] = value;
        },

        SET_CACHE(state, _ref2) {
          let key = _ref2.key,
              value = _ref2.value;
          state.cache[key] = value;
        },

        DELETE_FROM_CACHE(state, _ref3) {
          let key = _ref3.key;
          const groups = state.cache[key].groups;
          groups && groups.map(group => {
            state.groups[group] = state.groups[group].filter(el => el !== key);
            if (state.groups[group].length < 0) delete state.groups[group];
          });
          delete state.cache[key];
        },

        SET_GROUP(state, _ref4) {
          let group = _ref4.group,
              key = _ref4.key;
          state.groups[group] = [key];
        },

        UPDATE_GROUP(state, _ref5) {
          let group = _ref5.group,
              key = _ref5.key;
          state.groups[group].push(key);
        },

        DELETE_GROUP(state, _ref6) {
          let group = _ref6.group;
          delete state.groups[group];
        }

      },
      actions: {
        deleteFromCache(_ref7, key) {
          let commit = _ref7.commit;
          commit('DELETE_FROM_CACHE', {
            key
          });
        },

        cache(_ref8, payload) {
          let commit = _ref8.commit,
              getters = _ref8.getters;
          const config = payload.config,
                data = payload.data;
          const groups = config.groups,
                url = config.url,
                body = config.data;
          const garbageColector = config.garbageColector || getters.garbageColector; // Custom or default garbage colector

          const ttl = config.ttl || getters.ttl; // Custom or default ttl

          const key = (0, _stringHash.default)(url + body);
          const value = {
            data,
            body,
            garbageColectorId: garbageColector && setTimeout(() => {
              commit('DELETE_FROM_CACHE', {
                key
              });
            }, ttl),
            endpoint: config.url,
            groups: config.groups,
            expires: (0, _moment.default)().add(ttl, 'milliseconds').format(),
            timestamp: (0, _moment.default)().format()
          };
          groups && groups.map(group => {
            getters.group(group) && getters.group(group).length > 0 ? commit('UPDATE_GROUP', {
              group,
              key
            }) : commit('SET_GROUP', {
              group,
              key
            });
          });
          commit('SET_CACHE', {
            key,
            value
          });
        },

        clean(_ref9, payload) {
          let state = _ref9.state,
              commit = _ref9.commit,
              getters = _ref9.getters;
          const groupNames = payload.clean; // Groups with related calls to be deleted

          const group = getters.group; // Existing groups within the cache system

          groupNames.forEach(name => {
            group(name) && group(name).forEach(key => {
              const _getters$call = getters.call(key),
                    garbageColectorId = _getters$call.garbageColectorId;

              garbageColectorId && clearTimeout(garbageColectorId); // Unset the timeout

              commit('DELETE_FROM_CACHE', {
                key
              }); // Delete response
            });
            commit('DELETE_GROUP', {
              name
            }); // Delete the group
          });
        }

      }
    });
  };
}