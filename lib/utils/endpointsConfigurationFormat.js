"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = endpointsConfigurationFormat;

// Determines in which way the endpoints configuration has been set (as an array of strings or an array of objects)
function endpointsConfigurationFormat(endpoints) {
  try {
    if (endpoints.constructor !== Array) throw 'The endpoints property must be an array';
    if (endpoints.length === 0) return true;
    const containsOnlyObjects = endpoints.every(endpoint => endpoint === Object(endpoint) && endpoint.hasOwnProperty('endpoint') && endpoint.hasOwnProperty('methods'));
    const containsOnlyStrings = endpoints.every(endpoint => typeof endpoint === 'string');
    if (!containsOnlyObjects && !containsOnlyStrings) throw 'The endpoints property must contain only strings or only objects';
    if (containsOnlyStrings) return 'strings';
    if (containsOnlyObjects) return 'objects';
  } catch (e) {
    return false;
  }
}