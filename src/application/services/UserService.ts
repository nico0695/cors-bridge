import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserRepository } from '../repositories/UserRepository.js';
import type {
  CreateUserInput,
  PublicUser,
  UpdateUserInput,
  UpdateUserRecord,
  User,
  UserStatus,
} from '../../domain/User.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 5;

type TokenType = 'access' | 'refresh';

interface VerifiedTokenPayload extends jwt.JwtPayload {
  sub: string;
  type: TokenType;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly jwtSecret: string
  ) {
    if (!jwtSecret || jwtSecret.trim().length === 0) {
      throw new Error('JWT secret is required to initialize UserService');
    }
  }

  listUsers(): PublicUser[] {
    return this.repository.findAll().map((user) => this.toPublicUser(user));
  }

  hasUsers(): boolean {
    return this.repository.count() > 0;
  }

  getUserById(id: string): PublicUser | null {
    const user = this.repository.findById(id);
    return user ? this.toPublicUser(user) : null;
  }

  createUser(input: CreateUserInput): PublicUser {
    const normalizedName = this.normalizeName(input.name);
    if (normalizedName.length === 0) {
      throw new Error('Name is required');
    }

    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    const existing = this.repository.findByName(normalizedName);
    if (existing) {
      throw new Error(`User with name ${normalizedName} already exists`);
    }

    const { hash, salt } = this.hashPassword(input.password);
    const status = this.normalizeStatus(input.status);

    const user = this.repository.save({
      name: normalizedName,
      email: this.normalizeEmail(input.email),
      status,
      passwordHash: hash,
      passwordSalt: salt,
    });

    return this.toPublicUser(user);
  }

  updateUser(id: string, input: UpdateUserInput): PublicUser | null {
    const existing = this.repository.findById(id);
    if (!existing) {
      return null;
    }

    const updates: UpdateUserRecord = {};

    if (input.name !== undefined) {
      const normalizedName = this.normalizeName(input.name);
      if (normalizedName.length === 0) {
        throw new Error('Name cannot be empty');
      }
      const conflict = this.repository.findByName(normalizedName);
      if (conflict && conflict.id !== id) {
        throw new Error(`User with name ${normalizedName} already exists`);
      }
      updates.name = normalizedName;
    }

    if (input.email !== undefined) {
      if (input.email === null) {
        updates.email = null;
      } else {
        const normalizedEmail = this.normalizeEmail(input.email);
        updates.email = normalizedEmail ?? null;
      }
    }

    if (input.status !== undefined) {
      updates.status = this.normalizeStatus(input.status);
    }

    if (input.password !== undefined) {
      if (input.password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        );
      }
      const { hash, salt } = this.hashPassword(input.password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
    }

    if (Object.keys(updates).length === 0) {
      return this.toPublicUser(existing);
    }

    const updated = this.repository.update(id, updates);
    return updated ? this.toPublicUser(updated) : null;
  }

  deleteUser(id: string): boolean {
    return this.repository.delete(id);
  }

  authenticate(name: string, password: string): AuthTokens {
    const normalizedName = this.normalizeName(name);
    const user = this.repository.findByName(normalizedName);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'enabled') {
      throw new Error('User is not enabled');
    }

    if (!this.isPasswordValid(password, user)) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  refreshTokens(refreshToken: string): AuthTokens {
    const payload = this.verifyToken(refreshToken, 'refresh');
    const user = this.repository.findById(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.status !== 'enabled') {
      throw new Error('User is not enabled');
    }
    return this.generateTokens(user);
  }

  verifyAccessToken(accessToken: string): PublicUser {
    const payload = this.verifyToken(accessToken, 'access');
    const user = this.repository.findById(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.status !== 'enabled') {
      throw new Error('User is not enabled');
    }
    return this.toPublicUser(user);
  }

  private generateTokens(user: User): AuthTokens {
    const accessToken = jwt.sign(
      { sub: user.id, name: user.name, type: 'access' },
      this.jwtSecret,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: REFRESH_TOKEN_TTL }
    );

    return {
      accessToken,
      refreshToken,
      user: this.toPublicUser(user),
    };
  }

  private verifyToken(
    token: string,
    expectedType: TokenType
  ): VerifiedTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as VerifiedTokenPayload;
      if (decoded.type !== expectedType) {
        throw new Error('Invalid token type');
      }
      if (!decoded.sub) {
        throw new Error('Token subject missing');
      }
      return decoded;
    } catch (_error) {
      throw new Error('Invalid or expired token');
    }
  }

  private hashPassword(password: string): { hash: string; salt: string } {
    const salt = randomBytes(16).toString('base64');
    const derivedKey = scryptSync(password, salt, KEY_LENGTH);
    return {
      hash: derivedKey.toString('base64'),
      salt,
    };
  }

  private isPasswordValid(password: string, user: User): boolean {
    const derivedKey = scryptSync(password, user.passwordSalt, KEY_LENGTH);
    const storedKey = Buffer.from(user.passwordHash, 'base64');
    if (derivedKey.length !== storedKey.length) {
      return false;
    }
    return timingSafeEqual(derivedKey, storedKey);
  }

  private normalizeName(name: string): string {
    return name.trim();
  }

  private normalizeEmail(email?: string): string | undefined {
    if (!email) {
      return undefined;
    }
    const trimmed = email.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeStatus(status?: UserStatus): UserStatus {
    if (!status) {
      return 'enabled';
    }
    if (status !== 'enabled' && status !== 'blocked') {
      throw new Error('Invalid user status');
    }
    return status;
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
