import {AuthMiddleware} from "../../../src/util/middleware/auth.middleware";
import {Context} from "vm";
import {HttpStatus} from "@citrineos/base";

describe("GivenTestingAuthMiddleware", () => {

  let authMiddleware: AuthMiddleware;

  beforeEach(() => {
    authMiddleware = new AuthMiddleware();
  });

  test("AuthMiddleware_ThrowsWhen_AuthorizationHeader_IsMissing", async () => {

    const throwMock = jest.fn();
    const nextMock = jest.fn();

    const ctx: Context = {
      request: {
        headers: {},
        originalUrl: "/any",
      },
      throw: throwMock
    };

    const actual = await authMiddleware.use(ctx, nextMock);

    expect(nextMock.mock.calls.length).toBe(0);
    expect(throwMock.mock.calls.length).toBe(1);
    expect(throwMock.mock.calls).toEqual([[HttpStatus.UNAUTHORIZED, expect.anything()]]);
  });
});
