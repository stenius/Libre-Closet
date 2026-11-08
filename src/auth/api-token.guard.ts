import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { ApiTokenService } from './api-token.service';

/**
 * Authenticates API requests from an `Authorization: Bearer` token.
 * Like the web guards, it allows everything when AUTH_ENABLED=false.
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly apiTokenService: ApiTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.configService.get<boolean>('AUTH_ENABLED')) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '');
    const payload = match
      ? await this.apiTokenService.authenticate(match[1])
      : null;
    if (!payload) throw new UnauthorizedException();

    request['user'] = payload;
    return true;
  }
}
