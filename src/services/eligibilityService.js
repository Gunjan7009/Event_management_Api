const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

const checkAgeEligibility = (dateOfBirth, eligibility) => {
  const age = calculateAge(dateOfBirth);

  if (eligibility?.minAge !== undefined && age < eligibility.minAge) {
    return {
      eligible: false,
      message: `Minimum age required is ${eligibility.minAge}`,
    };
  }

  if (eligibility?.maxAge !== undefined && age > eligibility.maxAge) {
    return {
      eligible: false,
      message: `Maximum age allowed is ${eligibility.maxAge}`,
    };
  }

  return {
    eligible: true,
    age,
  };
};

module.exports = {
  calculateAge,
  checkAgeEligibility,
};
