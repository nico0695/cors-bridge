export type UserStatus = 'enabled' | 'blocked';

export interface User {
  id: string;
  name: string;
  email?: string;
  passwordHash: string;
  passwordSalt: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  password: string;
  email?: string;
  status?: UserStatus;
}

export interface UpdateUserInput {
  name?: string;
  password?: string;
  email?: string | null;
  status?: UserStatus;
}

export interface CreateUserRecord {
  name: string;
  email?: string;
  status: UserStatus;
  passwordHash: string;
  passwordSalt: string;
}

export interface UpdateUserRecord {
  name?: string;
  email?: string | null;
  status?: UserStatus;
  passwordHash?: string;
  passwordSalt?: string;
}
