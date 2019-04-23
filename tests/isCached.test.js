import isCached from '../src/utils/isCached.js'

const users = '/users'
const assets = '/assets'
const method = 'get'

test('All request should be cached', () => {
  expect(isCached([], [], { url: users, method })).toBe(true)
})

test('Request should be cached because of methods config', () => {
  expect(isCached(['get'], [], { url: users, method })).toBe(true)
})

test('Request should be cached because of methods config but is not specified as endpoint', () => {
  expect(isCached(['get'], [{endpoint: '/users', methods: ['get']}], { url: assets, method })).toBe(true)
})

test('Request should be cached because of endpoints config', () => {
  expect(isCached(['post'], [{endpoint: '/users', methods: ['get']}], { url: users, method })).toBe(true)
})

test('Request should not be cached because of endpoints config', () => {
  expect(isCached(['get'], [{endpoint: '/users', methods: ['post']}], { url: users, method })).toBe(false)
})

test('Request should be cached because cache has been set manually to true', () => {
  expect(isCached([], [{endpoint: '/users', methods: ['post']}], { url: users, method, cache: true })).toBe(true)
})

test('Request should not be cached because cache has been set manually to false', () => {
  expect(isCached([], [{endpoint: '/users', methods: ['post']}], { url: users, method })).toBe(false)
})
