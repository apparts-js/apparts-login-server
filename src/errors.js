class PasswordNotValidError extends Error {
  constructor(response) {
    super(response);
  }
}

module.exports = { PasswordNotValidError };
