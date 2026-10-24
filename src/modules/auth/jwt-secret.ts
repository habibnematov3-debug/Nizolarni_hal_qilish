const DEVELOPMENT_JWT_SECRET = 'nizolarni_hal_qilish_development_only_secret_change_me';

export function getJwtSecret() {
  const configured = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) {
    throw new Error('Production rejimida JWT_SECRET kamida 32 belgidan iborat maxfiy qiymat bo‘lishi shart');
  }
  return configured || DEVELOPMENT_JWT_SECRET;
}
