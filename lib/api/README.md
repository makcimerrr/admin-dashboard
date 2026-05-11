# `lib/api` — Standardized API helpers

Every `app/api/**/route.ts` should use these helpers so that all responses share
the same shape, all auth checks are centralised, and all errors are caught.

## Response envelope

```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: ApiErrorCode, message: string, details?: unknown } }
```

Error codes are mapped to HTTP statuses:

| Code               | HTTP |
|--------------------|-----:|
| `UNAUTHENTICATED`  | 401  |
| `FORBIDDEN`        | 403  |
| `NOT_FOUND`        | 404  |
| `BAD_REQUEST`      | 400  |
| `CONFLICT`         | 409  |
| `INTERNAL_ERROR`   | 500  |

## Writing a new route

```ts
import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, withAuth, withErrorHandler } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (req: NextRequest, { user }) => {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return apiError('BAD_REQUEST', 'id requis');

    const row = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!row) return apiError('NOT_FOUND', 'Utilisateur introuvable');

    return apiSuccess({ user: row });
  }),
);
```

For admin-only endpoints replace `withAuth` with `withAdmin` — it adds a role
check and returns `FORBIDDEN` for non-admins.

## Reading from the client

```ts
const res = await fetch('/api/...');
const json = await res.json();

if (json?.success) {
  // json.data is the typed payload
  setStuff(json.data.user);
} else {
  // json.error.code | json.error.message
  toast.error(json?.error?.message ?? 'Erreur');
}
```

## Soft failures

For business rules that aren't HTTP errors (e.g. "no Discord linked"),
return `apiSuccess({ ...payload, reason: 'no_discord' })` with HTTP 200, and let
the client branch on `data.reason`. Reserve `apiError(...)` for actual
authentication, validation, lookup, and server errors.

## Migration plan

Legacy routes still emit ad hoc shapes (`{success, promotions}`,
`{success, rows}`, etc.). Migrate one route at a time:

1. Rewrite the route using the helpers (no manual `NextResponse.json` calls).
2. Update every client (`grep -rn "/api/<route>"`) to read `json.data.xxx`
   instead of `json.xxx`.
3. Adjust error handling to `json?.error?.message`.

Keep the legacy shape only if a route has many clients you can't update in one
PR — return both `data` and the old field for one cycle, then drop the old
field.
