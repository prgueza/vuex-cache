"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cachePlugin;

var _stringHash = _interopRequireDefault(require("string-hash"));

var _moment = _interopRequireDefault(require("moment"));

var _isCached = _interopRequireDefault(require("./utils/isCached.js"));

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
        status: config.cachedResponseStatus,
        statusText: config.cachedResponseMessage
      });
    }; // Axios interceptor function that checks if the request is cached


    const RequestInterceptor = config => {
      const method = config.method,
            url = config.url,
            baseURL = config.baseURL,
            clean = config.clean,
            localGarbageColector = config.garbageColector,
            data = config.data;
      const _store$getters = store.getters,
            methods = _store$getters.methods,
            endpoints = _store$getters.endpoints,
            cache = _store$getters.cache,
            globalGarbageColector = _store$getters.garbageColector;
      const garbageColector = localGarbageColector === undefined ? globalGarbageColector : localGarbageColector; // If the clean setting is set in the config, clean up cache before making the request

      if (clean) store.dispatch('clean', {
        clean
      }); // If the request could've been cached

      if ((0, _isCached.default)(methods, endpoints, config)) {
        config.cache = true; // Set cache to true so the response gets stored

        const key = (0, _stringHash.default)(baseURL + url + JSON.stringify(data));
        const cachedResponse = cache[key]; // Look for the cached response

        if (cachedResponse && (garbageColector || (0, _moment.default)(cachedResponse.expires).isAfter((0, _moment.default)()))) {
          // If the response is stored in cache
          config.cachedResponse = cachedResponse; // Store cached response in config

          config.adapter = Adapter; // Set the adapter to return the cached response

          config.cache = false; // Set cache to false so the response interceptor doesn't re-store the response data
        }
      }

      return config;
    }; // Axios interceptor functions that caches the response from the server


    const ResponseInterceptor = response => {
      const cache = response.config.cache,
            config = response.config,
            data = response.data;
      if (cache) store.dispatch('cache', {
        config,
        data
      }); // Cache the response

      return response;
    };
    /* AXIOS INSTANCE CONFIGURATION */


    instance.defaults.cache = false; // Calls are not cached by default

    instance.defaults.cachedResponseStatus = customSettings.cachedResponseStatus || 304;
    instance.defaults.cachedResponseMessage = customSettings.cachedResponseMessage || 'Not modified';
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
          const _state$cache$key$grou = state.cache[key].groups,
                groups = _state$cache$key$grou === void 0 ? [] : _state$cache$key$grou;
          groups.map(group => {
            state.groups[group] = state.groups[group].filter(el => el !== key);
            if (state.groups[group].length === 0) delete state.groups[group];
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
          const _config$groups = config.groups,
                groups = _config$groups === void 0 ? [] : _config$groups,
                url = config.url,
                body = config.data;
          const groupsArray = Object.values(groups);
          const garbageColector = config.garbageColector || getters.garbageColector; // Custom or default garbage colector

          const ttl = config.ttl || getters.ttl; // Custom or default ttl

          const key = (0, _stringHash.default)(url + body);
          const garbageColectorId = getters.cache[key] && getters.cache[key].garbageColectorId; // If the call is already cached

          if (garbageColectorId) clearTimeout(garbageColectorId); // Unset the timeout

          const value = {
            data,
            body,
            garbageColectorId: garbageColector && setTimeout(() => {
              commit('DELETE_FROM_CACHE', {
                key
              });
            }, ttl),
            endpoint: config.url,
            groups: groupsArray,
            expires: (0, _moment.default)().add(ttl, 'milliseconds').format(),
            timestamp: (0, _moment.default)().format()
          };
          groupsArray.map(group => {
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

              if (garbageColectorId) clearTimeout(garbageColectorId); // Unset the timeout

              commit('DELETE_FROM_CACHE', {
                key
              }); // Delete responses
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