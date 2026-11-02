export function isPersistentAccountScope(
  userId: string | null,
): userId is string {
  return userId !== null;
}

export function isActivePrivateAccountScope(
  scopeUserId: string | null,
  activeUserId: string | null,
): boolean {
  return scopeUserId !== null && scopeUserId === activeUserId;
}
