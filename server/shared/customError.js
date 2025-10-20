export default class CustomError extends Error {
  constructor(code, status, data = null) {
    super();
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

