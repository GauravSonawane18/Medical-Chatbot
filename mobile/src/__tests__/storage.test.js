import { clearSession, getToken, loadSession, saveSession } from '../storage';

describe('storage', () => {
  beforeEach(async () => {
    await clearSession();
  });

  it('returns null token when nothing is saved', async () => {
    const token = await getToken();
    expect(token).toBeNull();
  });

  it('saves and loads a session correctly', async () => {
    const user = { id: 1, name: 'Jane', role: 'patient', email: 'jane@example.com' };
    await saveSession('tok_abc', user);

    const { token, user: loaded } = await loadSession();
    expect(token).toBe('tok_abc');
    expect(loaded).toEqual(user);
  });

  it('clears session properly', async () => {
    await saveSession('tok_xyz', { id: 2, name: 'Bob', role: 'doctor' });
    await clearSession();

    const { token, user } = await loadSession();
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  it('getToken returns saved token', async () => {
    await saveSession('tok_123', { id: 3, name: 'Alice', role: 'patient' });
    expect(await getToken()).toBe('tok_123');
  });
});
