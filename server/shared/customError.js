export default class CustomError extends Error {
  constructor(code, status) {
    super();
    this.status = status;
    this.code = code;
  }
}

