import { API_BASE_URL } from '../api';

// We test the API module's structure and URL building without hitting the network.
// Actual network calls are tested via integration tests with the real backend.

describe('api module', () => {
  it('exports a non-empty API_BASE_URL', () => {
    expect(API_BASE_URL).toBeTruthy();
    expect(typeof API_BASE_URL).toBe('string');
  });

  it('API_BASE_URL does not have a trailing slash', () => {
    expect(API_BASE_URL.endsWith('/')).toBe(false);
  });
});

describe('api fetch behaviour', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('login sends POST to /login without Authorization header', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ access_token: 'tok', user: { role: 'patient' } }),
    });

    const { api } = require('../api');
    const result = await api.login({ email: 'a@b.com', password: 'pass' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/login`);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBeUndefined();
    expect(result.access_token).toBe('tok');
  });

  it('throws a readable error on 401', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    const { api } = require('../api');
    await expect(api.login({ email: 'x@y.com', password: 'wrong' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('throws a network error when server is unreachable', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const { api } = require('../api');
    await expect(api.healthCheck()).rejects.toThrow('Cannot reach the server');
  });

  it('healthCheck calls GET /health', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: 'ok' }),
    });

    const { api } = require('../api');
    const result = await api.healthCheck();
    expect(fetch.mock.calls[0][0]).toBe(`${API_BASE_URL}/health`);
    expect(result.status).toBe('ok');
  });
});
