import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Redirect,
  Render,
  UseGuards,
} from '@nestjs/common';
import { ApiTokenGuard } from './api-token.guard';
import { ApiTokenService } from './api-token.service';
import { AuthGuard } from './auth.guard';
import { Payload } from './dto/payload.dto';
import { User } from './user.decorator';

@UseGuards(AuthGuard)
@Controller('auth/tokens')
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Get()
  @Render('auth/tokens')
  async index(@User() user: Payload) {
    return { tokens: await this.apiTokenService.list(user.userId) };
  }

  @Post()
  @Render('auth/tokens')
  async create(@User() user: Payload, @Body('name') name: unknown) {
    const newToken = await this.apiTokenService.create(user.userId, name);
    return { newToken, tokens: await this.apiTokenService.list(user.userId) };
  }

  @Post(':id/delete')
  @Redirect('/auth/tokens', 302)
  async revoke(
    @User() user: Payload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.apiTokenService.revoke(user.userId, id);
  }
}

@UseGuards(ApiTokenGuard)
@Controller('api/v1')
export class ApiIdentityController {
  @Get('me')
  me(@User() user?: Payload) {
    return { userId: user?.userId ?? null, email: user?.email ?? null };
  }
}
