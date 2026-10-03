const mongoose = require("mongoose");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};



const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isDateOfBirthValid = (dateOfBirth) => {
  const date = new Date(dateOfBirth);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return date <= today;
};

module.exports = {
  isValidEmail,
  isDateOfBirthValid,
  isValidObjectId,
};
