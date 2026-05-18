import type { RoleCode } from '@/types/roles';

export interface PlatformUserDTO {
  userId: string;
  email: string;
  username: string;
  fullName: string | null;
  role: RoleCode;
  roleId: string;
  active: boolean;
  auth0Sub: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UserCreatePayload {
  username: string;
  email: string;
  roleId: string;
  fullName?: string;
  auth0Sub?: string;
}

export type UserPatchPayload = Partial<{
  username: string;
  fullName: string;
  roleId: string;
  active: boolean;
}>;

export interface UserListParams {
  active?: boolean;
}
