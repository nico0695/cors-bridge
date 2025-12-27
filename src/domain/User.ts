export type UserStatus = 'enabled' | 'blocked';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email?: string;
  passwordHash: string;
  passwordSalt: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  password: string;
  email?: string;
  status?: UserStatus;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  password?: string;
  email?: string | null;
  status?: UserStatus;
  role?: UserRole;
}

export interface CreateUserRecord {
  name: string;
  email?: string;
  status: UserStatus;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
}

export interface UpdateUserRecord {
  name?: string;
  email?: string | null;
  status?: UserStatus;
  role?: UserRole;
  passwordHash?: string;
  passwordSalt?: string;
}
