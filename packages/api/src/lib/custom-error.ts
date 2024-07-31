export class CustomError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
