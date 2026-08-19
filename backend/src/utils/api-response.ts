export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export const createSuccessResponse = <T>(
  message: string,
  data: T,
): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});
