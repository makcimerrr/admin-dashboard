import { NextResponse } from 'next/server';

/**
 * Standard API response envelope used across all routes.
 *
 *  - On success: `{ success: true, data: T }`
 *  - On error: `{ success: false, error: { code, message, details? } }`
 *
 * Use the helpers below — never craft this shape by hand.
 */

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export type ApiError = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export function apiSuccess<T>(data: T, init?: { status?: number }): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status: init?.status ?? 200 });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status: STATUS_BY_CODE[code] },
  );
}
