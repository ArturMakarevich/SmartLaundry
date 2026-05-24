export type UserRole = "user" | "admin" | "superadmin";

export type UserInfo = {
  id: number;
  email: string;
  role: UserRole;
};

export type AdminUserItem = {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
};
