export function getAccountStorageKey(
  key: string,
  userId: string | null,
): string {
  return userId === null
    ? key
    : `enemfordevs:account:${encodeURIComponent(userId)}:${key}`;
}
