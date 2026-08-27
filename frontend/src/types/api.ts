export interface ApiValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: ApiValidationError[];
}
