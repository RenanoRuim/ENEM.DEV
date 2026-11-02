const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/u;

export function getSecureStoreChunkKey(
  storageKey: string,
  chunkName: string,
): string {
  if (
    !SECURE_STORE_KEY_PATTERN.test(storageKey) ||
    !SECURE_STORE_KEY_PATTERN.test(chunkName)
  ) {
    throw new Error("A chave de armazenamento da sessão não é válida para SecureStore.");
  }
  return `${storageKey}.${chunkName}`;
}
