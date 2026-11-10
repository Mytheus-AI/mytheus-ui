/** A workspace member as the brain's pickers and lists show them (from `listMembers`). */
export type MemberOption = {
  /** `users.id`, what `owner_user_id` takes */
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  isYou: boolean;
};

export function memberMap(members: readonly MemberOption[]): Map<string, MemberOption> {
  return new Map(members.map((m) => [m.id, m]));
}
