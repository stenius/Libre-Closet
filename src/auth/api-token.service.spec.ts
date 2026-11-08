import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTokenService } from './api-token.service';

describe('ApiTokenService', () => {
  const user = { id: 7, email: 'a@b.c', password: 'bcrypt-hash-12345678' };
  let stored: any;
  let tokens: any;
  let service: ApiTokenService;

  beforeEach(() => {
    stored = undefined;
    tokens = {
      create: jest.fn((data) => (stored = { id: 1, ...data })),
      findOne: jest.fn(async ({ tokenHash }) =>
        stored?.tokenHash === tokenHash
          ? { ...stored, user: { getEntity: () => stored.owner ?? user } }
          : null,
      ),
      nativeUpdate: jest.fn(),
      nativeDelete: jest.fn(async () => 0),
    };
    service = new ApiTokenService(
      tokens,
      { findOneOrFail: jest.fn(async () => user) } as any,
      { persistAndFlush: jest.fn() } as any,
    );
  });

  it('stores only a hash of the token', async () => {
    const token = await service.create(7, 'mcp');
    expect(token).toMatch(/^lc_/);
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it.each(['', '   ', 'x'.repeat(101), 5])('rejects name %j', async (name) => {
    await expect(service.create(7, name)).rejects.toThrow(BadRequestException);
  });

  it('authenticates a valid token as its owner', async () => {
    const token = await service.create(7, 'mcp');
    await expect(service.authenticate(token)).resolves.toEqual({
      userId: 7,
      email: 'a@b.c',
      pwf: '12345678',
    });
    expect(tokens.nativeUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown and malformed tokens', async () => {
    await service.create(7, 'mcp');
    await expect(service.authenticate('lc_nope')).resolves.toBeNull();
    await expect(service.authenticate('jwt.value')).resolves.toBeNull();
  });

  it('rejects a token after the password changes', async () => {
    const token = await service.create(7, 'mcp');
    stored.owner = { ...user, password: 'new-bcrypt-hash-abcdefgh' };
    await expect(service.authenticate(token)).resolves.toBeNull();
  });

  it('only revokes tokens owned by the caller', async () => {
    await expect(service.revoke(7, 99)).rejects.toThrow(NotFoundException);
    expect(tokens.nativeDelete).toHaveBeenCalledWith({ id: 99, user: 7 });
  });
});
