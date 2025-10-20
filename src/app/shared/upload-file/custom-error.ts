export class CustomError extends Error {
  code: string;
  data?: any;
  status?: number;


  constructor(code: string, data?: any, status?: number) {
    super(code); // message = code
    this.code = code;
    this.data = data;
    this.status = status;
  }
}
