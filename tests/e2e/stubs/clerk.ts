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
  return {
    signOut: async () => undefined,
    // The workspace chooser: loaded, signed in, choosing (no active workspace yet).
    loaded: true,
    session: { status: "pending", lastActiveOrganizationId: null, getToken: async () => "test-token" },
  };
}
// Settings > Profile reads the Clerk user to save; with none, its save buttons stay disabled.
export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: null };
}

// The workspace chooser (`ChooseOrganization`): memberships come from `window.__orgMemberships`
// (a test sets it before mounting), and nothing is pending.
type Membership = { id: string; role: string; organization: { id: string; name: string; hasImage: boolean; imageUrl: string; membersCount: number } };
const page = <T,>(data: T[]) => ({ data, isLoading: false, revalidate: async () => undefined });
export function useOrganizationList() {
  const memberships = ((globalThis as { __orgMemberships?: Membership[] }).__orgMemberships ?? []) as Membership[];
  return {
    isLoaded: true,
    createOrganization: async ({ name }: { name: string }) => ({ id: `org-${name}` }),
    setActive: async () => undefined,
    userMemberships: page(memberships),
    userInvitations: page([] as never[]),
    userSuggestions: page([] as never[]),
  };
}
