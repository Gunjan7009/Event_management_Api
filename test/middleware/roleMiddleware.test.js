const authorizeRole = require("../../src/middleware/roleMiddleware");

describe("Role Middleware", () => {
  const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const createNext = () => jest.fn();

  test("should allow a user with an allowed role", () => {
    const req = {
      user: {
        role: "organizer",
      },
    };
    const res = createRes();
    const next = createNext();

    authorizeRole("organizer")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("should reject a user with a disallowed role", () => {
    const req = {
      user: {
        role: "attendee",
      },
    };
    const res = createRes();
    const next = createNext();

    authorizeRole("organizer")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You are not authorized to perform this action",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
