// Mock axios so jest never evaluates its ESM build (CRA ignores node_modules).
// The instance is created inside the factory (jest hoists this above imports),
// and reached in tests via the imported client, which IS this instance.
jest.mock('axios', () => {
  const instance = {
    interceptors: { request: { use: jest.fn() } },
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: '' },
  };
  return {
    __esModule: true,
    default: { create: () => instance },
    create: () => instance,
    isAxiosError: () => false,
  };
});

import apiClient, {
  exchangeAuthCode,
  stashAuthExchangeCode,
  takePendingAuthExchangeCode,
} from './apiClient';

const post = apiClient.post as jest.Mock;

// Guards the refresh-logout bug: a successful one-time exchange must clear the
// pending stash so the next same-tab refresh can't replay the consumed code
// (which the server rejects, wiping the valid session). A transient 5xx must
// keep the stash so a refresh legitimately retries.
describe('exchangeAuthCode pending-stash lifecycle', () => {
  afterEach(() => {
    post.mockReset();
    sessionStorage.clear();
  });

  it('clears the stash after a successful exchange', async () => {
    post.mockResolvedValue({ status: 200, data: { success: true, token: 'tok' } });

    stashAuthExchangeCode('CODE');
    await exchangeAuthCode('CODE');

    expect(takePendingAuthExchangeCode()).toBeNull();
  });

  it('keeps the stash when the exchange fails transiently (5xx throws)', async () => {
    post.mockRejectedValue(new Error('network'));

    stashAuthExchangeCode('CODE');
    await expect(exchangeAuthCode('CODE')).rejects.toThrow();

    expect(takePendingAuthExchangeCode()).toBe('CODE');
  });
});
