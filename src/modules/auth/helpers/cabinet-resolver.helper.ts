import { CabinetType, RegistryStatus } from '@prisma/client';

export interface CabinetResolutionResult {
  cabinetType: CabinetType;
  primaryRole: string;
  roles: string[];
}

export function resolveUserCabinetAndRoles(
  userRoles: string[],
  registryStatus: RegistryStatus,
): CabinetResolutionResult {
  const rolesSet = new Set(userRoles);

  // 1. ADMIN
  if (rolesSet.has('ADMIN')) {
    return {
      cabinetType: CabinetType.ADMIN,
      primaryRole: 'ADMIN',
      roles: Array.from(rolesSet),
    };
  }

  // 2. MINISTRY_STAFF
  if (rolesSet.has('MINISTRY_STAFF')) {
    return {
      cabinetType: CabinetType.MINISTRY_STAFF,
      primaryRole: 'MINISTRY_STAFF',
      roles: Array.from(rolesSet),
    };
  }

  // 3. REGIONAL_STAFF
  if (rolesSet.has('REGIONAL_STAFF')) {
    return {
      cabinetType: CabinetType.REGIONAL_STAFF,
      primaryRole: 'REGIONAL_STAFF',
      roles: Array.from(rolesSet),
    };
  }

  // 4. COMMISSION
  if (rolesSet.has('COMMISSION')) {
    return {
      cabinetType: CabinetType.COMMISSION,
      primaryRole: 'COMMISSION',
      roles: Array.from(rolesSet),
    };
  }

  // 5. OPERATOR
  if (rolesSet.has('OPERATOR')) {
    return {
      cabinetType: CabinetType.OPERATOR,
      primaryRole: 'OPERATOR',
      roles: Array.from(rolesSet),
    };
  }

  // 6. Registry based cabinets (Mediator, Hakamlik sudyasi, Arbitr)
  if (registryStatus === RegistryStatus.MEDIATOR || rolesSet.has('MEDIATOR')) {
    rolesSet.add('MEDIATOR');
    return {
      cabinetType: CabinetType.MEDIATOR,
      primaryRole: 'MEDIATOR',
      roles: Array.from(rolesSet),
    };
  }

  if (registryStatus === RegistryStatus.ARBITRATION_JUDGE || rolesSet.has('ARBITRATION_JUDGE')) {
    rolesSet.add('ARBITRATION_JUDGE');
    return {
      cabinetType: CabinetType.ARBITRATION_JUDGE,
      primaryRole: 'ARBITRATION_JUDGE',
      roles: Array.from(rolesSet),
    };
  }

  if (registryStatus === RegistryStatus.ARBITRATOR || rolesSet.has('ARBITRATOR')) {
    rolesSet.add('ARBITRATOR');
    return {
      cabinetType: CabinetType.ARBITRATOR,
      primaryRole: 'ARBITRATOR',
      roles: Array.from(rolesSet),
    };
  }

  // 7. Default: citizen or legal entity (mediation party)
  rolesSet.add('TALABGOR');
  return {
      cabinetType: CabinetType.PARTY,
      primaryRole: 'TALABGOR',
      roles: Array.from(rolesSet),
  };
}
