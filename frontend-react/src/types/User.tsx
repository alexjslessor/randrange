export type User = {
  id: string;
  username: string;
  email?: string | null;
  roles: string[];
  groups: string[];
  permissions: string[];
  is_superuser: boolean;
  is_group_admin: boolean;
  admin_group_ids?: string[];
  is_active: boolean;
  access_token?: string;
  refresh_token?: string;
};
