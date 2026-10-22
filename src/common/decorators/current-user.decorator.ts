import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CabinetType, RegistryStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  pinfl?: string | null;
  organizationId?: string | null;
  organization?: any;
  region?: string | null;
  cabinetType?: CabinetType;
  registryStatus?: RegistryStatus;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    return data && user ? user[data] : user;
  },
);
