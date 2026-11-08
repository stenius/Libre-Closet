import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiToken } from '../dal/entity/api-token.entity';
import { User } from '../dal/entity/user.entity';
import { Payload } from './dto/payload.dto';

const TOKEN_PREFIX = 'lc_';
const MAX_NAME_LENGTH = 100;
const LAST_USED_RESOLUTION_MS = 5 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class ApiTokenService {
  constructor(
    @InjectRepository(ApiToken)
    private readonly tokenRepository: EntityRepository<ApiToken>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  /** Returns the plaintext token, which cannot be recovered afterwards. */
  async create(userId: number, rawName: unknown): Promise<string> {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(
        `Token name must be 1 to ${MAX_NAME_LENGTH} characters`,
      );
    }
    const user = await this.userRepository.findOneOrFail({ id: userId });
    const plaintext = TOKEN_PREFIX + randomBytes(32).toString('base64url');
    const token = this.tokenRepository.create({
      name,
      tokenHash: hashToken(plaintext),
      pwf: user.password.slice(-8),
      createdAt: new Date(),
      user: user as any,
    });
    await this.em.persistAndFlush(token);
    return plaintext;
  }

  list(userId: number): Promise<ApiToken[]> {
    return this.tokenRepository.find(
      { user: userId },
      { orderBy: { createdAt: 'desc' } },
    );
  }

  async revoke(userId: number, tokenId: number): Promise<void> {
    const deleted = await this.tokenRepository.nativeDelete({
      id: tokenId,
      user: userId,
    });
    if (!deleted) throw new NotFoundException();
  }

  /** Resolves a bearer token to the same payload a login session carries. */
  async authenticate(plaintext: string): Promise<Payload | null> {
    if (!plaintext.startsWith(TOKEN_PREFIX)) return null;
    const token = await this.tokenRepository.findOne(
      { tokenHash: hashToken(plaintext) },
      { populate: ['user'] },
    );
    const user = token?.user.getEntity();
    if (!token || !user || user.password.slice(-8) !== token.pwf) return null;

    const now = Date.now();
    if (
      !token.lastUsedAt ||
      now - token.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
    ) {
      await this.tokenRepository.nativeUpdate(
        { id: token.id },
        { lastUsedAt: new Date(now) },
      );
    }
    return { userId: user.id, email: user.email, pwf: token.pwf };
  }
}
