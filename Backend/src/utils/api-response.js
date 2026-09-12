export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }

  static ok(data, message = "Success") {
    return new ApiResponse(200, data, message);
  }

  static created(data, message = "Created") {
    return new ApiResponse(201, data, message);
  }

  static noContent(message = "Success") {
    return new ApiResponse(204, null, message);
  }
}