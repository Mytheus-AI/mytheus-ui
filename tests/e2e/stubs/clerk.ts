// Clerk, at the edge: a signed-in session whose token the socket's auth callback asks for.
let n = 0;
export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => `test-token-${++n}`,
  };
}
// The consent page's "Not you? Sign out".
export function useClerk() {
  return { signOut: async () => undefined };
}
// Settings > Profile reads the Clerk user to save; with none, its save buttons stay disabled.
export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: null };
}
