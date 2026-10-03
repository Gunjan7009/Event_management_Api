require("dotenv").config();

const jwt = require("jsonwebtoken");
const authMiddleware = require("../../src/middleware/authMiddleware");

jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  const createReq = (authorization) => ({
    headers: authorization ? { authorization } : {},
  });

  const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const createNext = () => jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  test("should authenticate a valid token", () => {
    const req = createReq("Bearer valid-token");
    const res = createRes();
    const next = createNext();

    jwt.verify.mockReturnValue({
      userId: "user123",
      role: "attendee",
    });

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "valid-token",
      "test-secret",
    );
    expect(req.user).toEqual({
      userId: "user123",
      role: "attendee",
    });
    expect(next).toHaveBeenCalled();
  });

  test("should reject missing authorization header", () => {
    const req = createReq();
    const res = createRes();
    const next = createNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Authentication token required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("should reject invalid authorization format", () => {
    const req = createReq("InvalidToken");
    const res = createRes();
    const next = createNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("should reject an invalid token", () => {
    const req = createReq("Bearer invalid-token");
    const res = createRes();
    const next = createNext();

    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token",
    });
  });
});
