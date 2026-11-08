import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ConditionalAuthGuard } from './conditional-auth.guard';
import { RegistrationGuard } from './registration.guard';
import { ApiToken } from '../dal/entity/api-token.entity';
import {
  ApiIdentityController,
  ApiTokenController,
} from './api-token.controller';
import { ApiTokenGuard } from './api-token.guard';
import { ApiTokenService } from './api-token.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../dal/entity/user.entity';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { EmailModule } from '../email/email.module';
import { ViewContextModule } from '../view-context/view-context.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
    }),
    MikroOrmModule.forFeature([ApiToken, PasswordReset, User]),
    EmailModule,
  ],
  controllers: [AuthController, ApiTokenController, ApiIdentityController],
  providers: [
    AuthService,
    AuthGuard,
    ConditionalAuthGuard,
    RegistrationGuard,
    ApiTokenGuard,
    ApiTokenService,
    ViewContextModule,
  ],
  exports: [
    JwtModule,
    AuthService,
    AuthGuard,
    ConditionalAuthGuard,
    ApiTokenGuard,
    ApiTokenService,
  ],
})
export class AuthModule {}
