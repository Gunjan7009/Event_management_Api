require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../src/models/User");
const { register, login } = require("../src/controllers/authController");

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../src/models/User");

describe("Auth Controller", () => {
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

  describe("register", () => {
    test("should register a user successfully", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "JOHN@EXAMPLE.COM",
          password: "password123",
          dateOfBirth: "1998-01-01",
          role: "attendee",
        },
      };
      const res = createRes();
      const next = createNext();

      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed-password");

      User.create.mockResolvedValue({
        _id: "user123",
        name: "John Doe",
        email: "john@example.com",
        password: "hashed-password",
        dateOfBirth: "1998-01-01",
        role: "attendee",
      });

      await register(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        email: "JOHN@EXAMPLE.COM",
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(User.create).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "hashed-password",
        dateOfBirth: "1998-01-01",
        role: "attendee",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User registered successfully",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should reject missing fields", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "john@example.com",
        },
      };
      const res = createRes();
      const next = createNext();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "All fields are required",
      });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    test("should reject non-string email", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: { value: "john@example.com" },
          password: "password123",
          dateOfBirth: "1998-01-01",
          role: "attendee",
        },
      };
      const res = createRes();
      const next = createNext();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email must be a string",
      });
    });

    test("should reject invalid email", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "invalid-email",
          password: "password123",
          dateOfBirth: "1998-01-01",
          role: "attendee",
        },
      };
      const res = createRes();
      const next = createNext();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email address",
      });
    });

    test("should reject password shorter than 8 characters", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "john@example.com",
          password: "1234567",
          dateOfBirth: "1998-01-01",
          role: "attendee",
        },
      };
      const res = createRes();
      const next = createNext();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    });

    test("should reject invalid role", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
          dateOfBirth: "1998-01-01",
          role: "admin",
        },
      };
      const res = createRes();
      const next = createNext();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Role must be either organizer or attendee",
      });
    });

    test("should reject duplicate email", async () => {
      const req = {
        body: {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
          dateOfBirth: "1998-01-01",
          role: "attendee",
        },
      };
      const res = createRes();
      const next = createNext();

      User.findOne.mockResolvedValue({ _id: "existing-user" });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email already registered",
      });
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    test("should login successfully", async () => {
      const req = {
        body: {
          email: "JOHN@EXAMPLE.COM",
          password: "password123",
        },
      };
      const res = createRes();
      const next = createNext();

      const user = {
        _id: "user123",
        email: "john@example.com",
        password: "hashed-password",
        role: "attendee",
      };

      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("jwt-token");

      await login(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        email: "john@example.com",
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashed-password",
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: "user123",
          role: "attendee",
        },
        "test-secret",
        { expiresIn: "1h" },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Login successful",
        token: "jwt-token",
      });
    });

    test("should reject invalid email format", async () => {
      const req = {
        body: {
          email: "invalid-email",
          password: "password123",
        },
      };
      const res = createRes();
      const next = createNext();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(User.findOne).not.toHaveBeenCalled();
    });

    test("should reject when user does not exist", async () => {
      const req = {
        body: {
          email: "john@example.com",
          password: "password123",
        },
      };
      const res = createRes();
      const next = createNext();

      User.findOne.mockResolvedValue(null);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    test("should reject incorrect password", async () => {
      const req = {
        body: {
          email: "john@example.com",
          password: "wrongpassword",
        },
      };
      const res = createRes();
      const next = createNext();

      User.findOne.mockResolvedValue({
        _id: "user123",
        password: "hashed-password",
        role: "attendee",
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
