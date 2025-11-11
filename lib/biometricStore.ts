import localforage from "localforage";

type NullableStore = ReturnType<typeof localforage.createInstance> | null;

const isBrowser = typeof window !== "undefined";

const safeCreateStore = (storeName: string): NullableStore => {
  if (!isBrowser) {
    return null;
  }

  try {
    return localforage.createInstance({
      name: "warpdrive-biometrics",
      storeName,
    });
  } catch (error) {
    console.warn(`localforage init failed for ${storeName}`, error);
    return null;
  }
};

let embeddingsStore: NullableStore;
let registryStore: NullableStore;
let sessionStore: NullableStore;

const ensureStores = () => {
  if (!embeddingsStore) embeddingsStore = safeCreateStore("embeddings");
  if (!registryStore) registryStore = safeCreateStore("registry");
  if (!sessionStore) sessionStore = safeCreateStore("session");
};

type MemoryState = {
  embeddings: Map<string, BiometricEmbedding>;
  registry: Map<string, UserRegistryRecord>;
  session: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    createdAt: number;
  } | null;
};

const memoryState: MemoryState = {
  embeddings: new Map(),
  registry: new Map(),
  session: null,
};

const withStore = async <T>(
  store: NullableStore,
  action: (instance: NonNullable<NullableStore>) => Promise<T>,
  fallback: () => T
): Promise<T> => {
  if (!store) {
    return fallback();
  }

  try {
    return await action(store);
  } catch (error) {
    console.warn("localforage operation failed; falling back to memory", error);
    return fallback();
  }
};

export type BiometricEmbedding = {
  uid: string;
  descriptor: number[];
  updatedAt: number;
};

export type UserRegistryRecord = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  biometricEnrolled: boolean;
  updatedAt: number;
};

type RegistryMap = Record<string, UserRegistryRecord>;

const getRegistry = async (): Promise<RegistryMap> =>
  withStore(
    registryStore,
    async (store) => (await store.getItem<RegistryMap>("users")) ?? {},
    () => {
      const snapshot: RegistryMap = {};
      memoryState.registry.forEach((value, key) => {
        snapshot[key] = value;
      });
      return snapshot;
    }
  );

export const saveEmbedding = async (record: BiometricEmbedding) => {
  ensureStores();

  await withStore(
    embeddingsStore,
    (store) => store.setItem(record.uid, record),
    () => {
      memoryState.embeddings.set(record.uid, record);
    }
  );
  memoryState.embeddings.set(record.uid, record);

  const registry = await getRegistry();
  const next: RegistryMap = {
    ...registry,
    [record.uid]: {
      ...(registry[record.uid] ?? {
        uid: record.uid,
        biometricEnrolled: true,
        updatedAt: record.updatedAt,
      }),
      biometricEnrolled: true,
      updatedAt: record.updatedAt,
    },
  };
  await withStore(
    registryStore,
    (store) => store.setItem("users", next),
    () => {
      memoryState.registry.set(record.uid, next[record.uid]);
    }
  );
};

export const getEmbedding = async (
  uid: string
): Promise<BiometricEmbedding | null> => {
  ensureStores();

  return withStore(
    embeddingsStore,
    async (store) => (await store.getItem<BiometricEmbedding>(uid)) ?? null,
    () => memoryState.embeddings.get(uid) ?? null
  );
};

export const updateUserRegistry = async (
  record: Partial<UserRegistryRecord> & { uid: string }
) => {
  ensureStores();

  const registry = await getRegistry();
  const baseline: UserRegistryRecord =
    registry[record.uid] ??
    ({
      uid: record.uid,
      biometricEnrolled: false,
      updatedAt: Date.now(),
    } as UserRegistryRecord);

  registry[record.uid] = {
    ...baseline,
    ...record,
    updatedAt: Date.now(),
  };

  await withStore(
    registryStore,
    (store) => store.setItem("users", registry),
    () => {
      memoryState.registry.set(record.uid, registry[record.uid]);
    }
  );
  memoryState.registry.set(record.uid, registry[record.uid]);
};

export const listRegisteredUsers = async (): Promise<UserRegistryRecord[]> => {
  ensureStores();

  const registry = await getRegistry();
  return Object.values(registry).sort(
    (a, b) => b.updatedAt - a.updatedAt || a.uid.localeCompare(b.uid)
  );
};

export const setOfflineSession = async (record: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}) => {
  ensureStores();
  const payload = {
    ...record,
    createdAt: Date.now(),
  };

  await withStore(
    sessionStore,
    (store) => store.setItem("offline-session", payload),
    () => {
      memoryState.session = payload;
    }
  );
  memoryState.session = payload;
};

export const getOfflineSession = async () =>
  withStore(
    sessionStore,
    async (store) =>
      (await store.getItem<{
        uid: string;
        email?: string | null;
        displayName?: string | null;
        createdAt: number;
      }>("offline-session")) ?? null,
    () => memoryState.session
  );

export const clearOfflineSession = async () => {
  ensureStores();

  await withStore(
    sessionStore,
    (store) => store.removeItem("offline-session"),
    () => {
      memoryState.session = null;
    }
  );
  memoryState.session = null;
};

