require("dotenv").config();

const Registration = require("../../src/models/Registration");
const {
  getMyRegistrations,
} = require("../../src/controllers/registrationController");
const { ids, createRes, createNext } = require("../helpers/testData");

jest.mock("../../src/models/Registration");

describe("getMyRegistrations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return the user's registrations", async () => {
    const req = { user: { userId: ids.userId } };
    const res = createRes();
    const next = createNext();

    const registrations = [
      { _id: ids.registrationId, registeredBy: ids.userId },
    ];
    const sort = jest.fn().mockResolvedValue(registrations);

    Registration.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort }),
    });

    await getMyRegistrations(req, res, next);

    expect(Registration.find).toHaveBeenCalledWith({
      registeredBy: ids.userId,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 1,
      registrations,
    });
  });
});
