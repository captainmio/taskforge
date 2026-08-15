import axios from "axios";
import type {
  FieldPath,
  FieldValues,
  UseFormSetError
} from "react-hook-form";
import type { ApiErrorResponse } from "../types/api";

export const FORM_ERROR = 'Form submission failed. Please check the highlighted fields.';

export const applyApiValidationErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return false;
  }

  const errors = error.response?.data?.errors;

  if (!errors?.length) {
    return false;
  }

  errors.forEach((serverError) => {
    const fieldName = serverError.field
      .replace("body.", "") as FieldPath<T>;

    setError(fieldName, {
      type: "server",
      message: serverError.message
    });
  });

  return true;
};