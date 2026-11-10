// Clerk, at the edge: a signed-in session whose token the socket's auth callback asks for.
let n = 0;
export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => `test-token-${++n}`,
  };
}
