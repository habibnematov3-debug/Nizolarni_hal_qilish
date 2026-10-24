import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OneIdAdapter } from './adapters/one-id.adapter';
import { EsignAdapter } from './adapters/esign.adapter';
import { MobileIdAdapter } from './adapters/mobile-id.adapter';
import { getJwtSecret } from './jwt-secret';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    OneIdAdapter,
    EsignAdapter,
    MobileIdAdapter,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
