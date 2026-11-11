/* Server actions the workspace, ops and onboarding skeleton pairs' page components import,
   answered at the edge. Nothing in the pairs submits; these only have to exist. */
const ok = async (..._args: unknown[]) => ({ ok: true as const });
export const inviteToWorkspace = ok;
export const renameWorkspace = ok;
export const setAgentCollaboration = ok;
export const setTenantSuspended = ok;
export const searchAuditLog = async (..._args: unknown[]) => ({ ok: true as const, data: { entries: [], truncated: false } });
export const removeFeatureFlag = ok;
export const toggleFeatureFlag = ok;
export const saveOrgProfile = ok;
export const importTerms = ok;
export const createOwner = ok;
export const deleteOwner = ok;
export const updateOwner = ok;
export const saveGroundRules = ok;
export const createTemplate = ok;
export const deleteTemplate = ok;
export const updateTemplate = ok;
export const createGoal = ok;
export const deleteGoal = ok;
export const reorderGoals = ok;
export const updateGoal = ok;
export const createTerm = ok;
export const deleteTerm = ok;
export const updateTerm = ok;
export const loadReadiness = ok;
// saveWorkingProfile and saveAgentPersona come from actions-skel-work.ts (one export per name).
