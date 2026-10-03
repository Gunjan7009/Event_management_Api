const {
  calculateAge,
  checkAgeEligibility,
} = require("../../src/services/eligibilityService");

describe("Eligibility Service", () => {
  test("should calculate age correctly", () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;

    const birthdayPassed =
      today.getMonth() > 0 ||
      (today.getMonth() === 0 && today.getDate() >= 1);

    const dateOfBirth = birthdayPassed
      ? `${birthYear}-01-01`
      : `${birthYear}-12-31`;

    const age = calculateAge(dateOfBirth);

    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });

  test("should reject attendee below minimum age", () => {
    const result = checkAgeEligibility(
      "2015-01-01",
      {
        minAge: 18,
      },
    );

    expect(result.eligible).toBe(false);
    expect(result.message).toBe("Minimum age required is 18");
  });

  test("should reject attendee above maximum age", () => {
    const result = checkAgeEligibility(
      "1950-01-01",
      {
        maxAge: 60,
      },
    );

    expect(result.eligible).toBe(false);
    expect(result.message).toBe("Maximum age allowed is 60");
  });

  test("should allow an eligible attendee", () => {
    const result = checkAgeEligibility(
      "2000-01-01",
      {
        minAge: 18,
        maxAge: 60,
      },
    );

    expect(result.eligible).toBe(true);
    expect(result.age).toBeGreaterThanOrEqual(25);
  });
});
