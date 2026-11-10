export default class CustomError extends Error {
  constructor(
    code,
    status,
    data = null,
  ) {
    super(code);

    this.name = 'CustomError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}
