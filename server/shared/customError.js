export default class CustomError extends Error {
  constructor(customMessage, status) {
    super();
    this.status = status;
    this.customMessage = customMessage;
  }
}

