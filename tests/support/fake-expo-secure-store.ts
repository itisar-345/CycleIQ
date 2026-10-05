const store = new Map<string, string>();

export const AFTER_FIRST_UNLOCK = 1;
export type SecureStoreOptions = { keychainAccessible?: number };
export const getItemAsync = async (key: string): Promise<string | null> => store.get(key) ?? null;
export const setItemAsync = async (key: string, value: string): Promise<void> => {
  store.set(key, value);
};
