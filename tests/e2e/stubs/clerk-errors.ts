// `@clerk/nextjs/errors`, for the workspace chooser's error helper: no Clerk API errors in tests.
export function isClerkAPIResponseError(_err: unknown): boolean {
  return false;
}
