export class PasswordNotValidError extends Error {
  constructor(response: string) {
    super(response);
  }
}
