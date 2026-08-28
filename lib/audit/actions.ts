export const AuditActions = {
  WORKSPACE_CREATED: "workspace.created",
  WORKSPACE_UPDATED: "workspace.updated",
  WORKSPACE_LAUNCHED: "workspace.launched",

  MEMBER_INVITED: "member.invited",
  MEMBER_JOINED: "member.joined",
  MEMBER_REMOVED: "member.removed",
  MEMBER_ROLE_CHANGED: "member.role_changed",
  MEMBER_SUSPENDED: "member.suspended",

  API_KEY_CREATED: "api_key.created",
  API_KEY_REVOKED: "api_key.revoked",

  SETTINGS_UPDATED: "workspace.settings_updated",
  BILLING_UPDATED: "billing.updated",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
