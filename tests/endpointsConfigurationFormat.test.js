import endpointsConfigurationFormat from '../src/utils/endpointsConfigurationFormat.js'

const endpointsAsStrings = ['str', 'str', 'str']
const endpointsAsObjects = [{endpoint: 'value', methods: ['value', 'value']}, {endpoint: 'value', methods: ['value', 'value']}]
const endpointEmpty = []
const endpointNull = null
const endpointInvalid = 'endpoint'

test('Entpoints as null throws error and returns false', () => {
  expect(endpointsConfigurationFormat(endpointNull)).toBe(false)
})

test('Entpoints are not configured but set as an array and returns true', () => {
  expect(endpointsConfigurationFormat(endpointEmpty)).toBe(true)
})

test('Entpoints as string throws error and returns false', () => {
  expect(endpointsConfigurationFormat(endpointInvalid)).toBe(false)
})

test('Entpoints as strings returns "strings"', () => {
  expect(endpointsConfigurationFormat(endpointsAsStrings)).toBe('strings')
})

test('Entpoints as objects returns "objects"', () => {
  expect(endpointsConfigurationFormat(endpointsAsObjects)).toBe('objects')
})
