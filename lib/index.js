"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cachePlugin;

var _stringHash = _interopRequireDefault(require("string-hash"));

var _moment = _interopRequireDefault(require("moment"));

var _isCached = _interopRequireDefault(require("./utils/isCached.js"));

var _cachedResponseBuilder = _interopRequireDefault(require("./utils/cachedResponseBuilder.js"));

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
      return Promise.resolve((0, _cachedResponseBuilder.default)(config));
    }; // Axios interceptor function that checks if the request is cached


    const RequestInterceptor = config => {
      const method = config.method,
            url = config.url,
            baseURL = config.baseURL,
            clean = config.clean,
            localgarbageCollector = config.garbageCollector,
            data = config.data,
            reload = config.reload;
      const _store$getters = store.getters,
            methods = _store$getters.methods,
            endpoints = _store$getters.endpoints,
            cache = _store$getters.cache,
            globalgarbageCollector = _store$getters.garbageCollector;
      const garbageCollector = localgarbageCollector === undefined ? globalgarbageCollector : localgarbageCollector; // If the clean setting is set in the config, clean up cache before making the request

      if (clean) store.dispatch('clean', {
        clean
      }); // If the request could've been cached

      if ((0, _isCached.default)(methods, endpoints, config)) {
        config.cache = true; // Set cache to true so the response gets stored

        const key = (0, _stringHash.default)(baseURL + url + JSON.stringify(data));
        const cachedResponse = cache[key]; // Look for the cached response

        if (!reload && cachedResponse && (garbageCollector || (0, _moment.default)(cachedResponse.expires).isAfter((0, _moment.default)()))) {
          config.cachedResponse = cachedResponse; // Store cached response in config

          config.adapter = Adapter; // Set the adapter to return the cached response

          config.cache = false; // Set cache to false so the response interceptor doesn't re-store the response data
        }
      }

      return config;
    }; // Axios interceptor functions that caches the response from the server


    const ResponseInterceptor = response => {
      const _response = response,
            _response$config = _response.config,
            cache = _response$config.cache,
            baseURL = _response$config.baseURL,
            url = _response$config.url,
            body = _response$config.data,
            reload = _response$config.reload,
            config = _response.config,
            data = _response.data,
            status = _response.status;

      if (!reload && store.getters.fallback.includes(status)) {
        const key = (0, _stringHash.default)(baseURL + url + JSON.stringify(body));
        const cachedResponse = cache[key]; // Look for the cached response

        if (cachedResponse) {
          config.cachedResponse = cachedResponse;
          response = (0, _cachedResponseBuilder.default)(config, true);
        }
      } else if (cache) {
        store.dispatch('cache', {
          config,
          data
        }); // Cache the response
      }

      return response;
    };
    /* AXIOS INSTANCE CONFIGURATION */


    const _ref = customSettings || {},
          _ref$cachedResponseSt = _ref.cachedResponseStatus,
          cachedResponseStatus = _ref$cachedResponseSt === void 0 ? 304 : _ref$cachedResponseSt,
          _ref$cachedResponseMe = _ref.cachedResponseMessage,
          cachedResponseMessage = _ref$cachedResponseMe === void 0 ? 'Not modified' : _ref$cachedResponseMe,
          _ref$fallbackResponse = _ref.fallbackResponseMessage,
          fallbackResponseMessage = _ref$fallbackResponse === void 0 ? 'Fallback result' : _ref$fallbackResponse,
          fallbackResponseStatus = _ref.fallbackResponseStatus;

    instance.defaults.cache = false; // Calls are not cached by default

    instance.defaults.cachedResponseStatus = cachedResponseStatus;
    instance.defaults.cachedResponseMessage = cachedResponseMessage;
    instance.defaults.fallbackResponseStatus = fallbackResponseStatus || cachedResponseStatus;
    instance.defaults.fallbackResponseMessage = fallbackResponseMessage;
    instance.defaults.groups = [];
    instance.interceptors.request.use(RequestInterceptor);
    instance.interceptors.response.use(ResponseInterceptor);
    /* CACHE DEFAULT SETTINGS */

    const defaultSettings = {
      methods: ['get'],
      endpoints: [],
      garbageCollector: false,
      fallback: [500],
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
        garbageCollector: state => state.garbageCollector,
        fallback: state => state.fallback,
        ttl: state => state.ttl * 1000 // Convert to ms

      },
      mutations: {
        SET_OPTIONS(state, _ref2) {
          let key = _ref2.key,
              value = _ref2.value;
          state[key] = value;
        },

        SET_CACHE(state, _ref3) {
          let key = _ref3.key,
              value = _ref3.value;
          state.cache[key] = value;
        },

        DELETE_FROM_CACHE(state, _ref4) {
          let key = _ref4.key;
          const _state$cache$key$grou = state.cache[key].groups,
                groups = _state$cache$key$grou === void 0 ? [] : _state$cache$key$grou;
          groups.map(group => {
            state.groups[group] = state.groups[group].filter(el => el !== key);
            if (state.groups[group].length === 0) delete state.groups[group];
          });
          delete state.cache[key];
        },

        SET_GROUP(state, _ref5) {
          let group = _ref5.group,
              key = _ref5.key;
          state.groups[group] = [key];
        },

        UPDATE_GROUP(state, _ref6) {
          let group = _ref6.group,
              key = _ref6.key;
          state.groups[group].push(key);
        },

        DELETE_GROUP(state, _ref7) {
          let group = _ref7.group;
          delete state.groups[group];
        }

      },
      actions: {
        deleteFromCache(_ref8, key) {
          let commit = _ref8.commit;
          commit('DELETE_FROM_CACHE', {
            key
          });
        },

        cache(_ref9, payload) {
          let commit = _ref9.commit,
              getters = _ref9.getters;
          const config = payload.config,
                data = payload.data;
          const _config$groups = config.groups,
                groups = _config$groups === void 0 ? [] : _config$groups,
                url = config.url,
                body = config.data;
          const groupsArray = Object.values(groups);
          const garbageCollector = config.garbageCollector || getters.garbageCollector; // Custom or default garbage colector

          const ttl = config.ttl || getters.ttl; // Custom or default ttl

          const key = (0, _stringHash.default)(url + body);
          const garbageCollectorId = getters.cache[key] && getters.cache[key].garbageCollectorId; // If the call is already cached

          if (garbageCollectorId) clearTimeout(garbageCollectorId); // Unset the timeout

          const value = {
            data,
            body,
            garbageCollectorId: garbageCollector && setTimeout(() => {
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

        clean(_ref10, payload) {
          let state = _ref10.state,
              commit = _ref10.commit,
              getters = _ref10.getters;
          const groupNames = payload.clean; // Groups with related calls to be deleted

          const group = getters.group; // Existing groups within the cache system

          groupNames.forEach(name => {
            group(name) && group(name).forEach(key => {
              const _getters$call = getters.call(key),
                    garbageCollectorId = _getters$call.garbageCollectorId;

              if (garbageCollectorId) clearTimeout(garbageCollectorId); // Unset the timeout

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