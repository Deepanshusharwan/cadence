// api.ts is a plain module (not a component), so it can't call Clerk's
// useAuth() hook directly to get a fresh session token per request. This is
// the bridge: <ClerkTokenBridge> (mounted once, inside <ClerkProvider>)
// hands its `getToken` function here, and apiFetch calls it before every
// request. If Clerk hasn't mounted yet (or the user is signed out),
// getAuthToken() resolves to null and the request goes out unauthenticated
// — the backend will reject it with 401, which is correct.
type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter | null) {
  tokenGetter = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
