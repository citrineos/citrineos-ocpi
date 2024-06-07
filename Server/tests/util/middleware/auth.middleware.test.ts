import { AuthMiddleware } from '../../../src/util/middleware/auth.middleware';
import { Context } from 'vm';
import { HttpStatus } from '@citrineos/base';
import { CredentialsRepository } from '../../../src/repository/credentials.repository';
import { Container } from 'typedi';

describe('GivenTestingAuthMiddleware', () => {
  let mockCredentialsRepository = jest.fn();
  let authMiddleware: AuthMiddleware;

  beforeEach(() => {
    Container.set(CredentialsRepository, mockCredentialsRepository);
    authMiddleware = Container.get(AuthMiddleware);
  });

  test('AuthMiddleware_ThrowsWhen_AuthorizationHeader_IsMissing', async () => {
    const throwMock = jest.fn();
    const nextMock = jest.fn();

    const ctx: Context = {
      request: {
        headers: {},
        originalUrl: '/any',
      },
      throw: throwMock,
    };

    const actual = await authMiddleware.use(ctx, nextMock);

    expect(nextMock.mock.calls.length).toBe(0);
    expect(throwMock.mock.calls.length).toBe(1);
    expect(throwMock.mock.calls).toEqual([
      [HttpStatus.UNAUTHORIZED, expect.anything()],
    ]);
  });
});
