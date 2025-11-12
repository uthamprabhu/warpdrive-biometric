import localforage from "localforage";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

const registryCollection = () =>
  db ? collection(db, "userRegistry") : null;

const embeddingCollection = () =>
  db ? collection(db, "biometricEmbeddings") : null;

const syncRegistryEntry = async (entry: UserRegistryRecord) => {
  const col = registryCollection();
  if (!col) return;

  try {
    await setDoc(doc(col, entry.uid), entry, { merge: true });
  } catch (error) {
    console.warn("Failed to sync registry to Firestore", error);
  }
};

const syncEmbedding = async (record: BiometricEmbedding) => {
  const col = embeddingCollection();
  if (!col) return;

  try {
    await setDoc(doc(col, record.uid), record, { merge: true });
  } catch (error) {
    console.warn("Failed to sync embedding to Firestore", error);
  }
};

const fetchRegistryFromRemote = async (): Promise<RegistryMap | null> => {
  const col = registryCollection();
  if (!col) return null;

  try {
    const snapshot = await getDocs(col);
    const remote: RegistryMap = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<UserRegistryRecord>;
      remote[docSnap.id] = {
        uid: docSnap.id,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        photoURL: data.photoURL ?? null,
        biometricEnrolled: Boolean(data.biometricEnrolled),
        updatedAt:
          typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
      };
    });
    return remote;
  } catch (error) {
    console.warn("Failed to fetch registry from Firestore", error);
    return null;
  }
};

const fetchEmbeddingFromRemote = async (
  uid: string
): Promise<BiometricEmbedding | null> => {
  const col = embeddingCollection();
  if (!col) return null;

  try {
    const snapshot = await getDoc(doc(col, uid));
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as BiometricEmbedding;
    return {
      uid,
      descriptor: data.descriptor,
      updatedAt:
        typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
    };
  } catch (error) {
    console.warn("Failed to fetch embedding from Firestore", error);
    return null;
  }
};

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
    async (store) => {
      await store.setItem(record.uid, record);
    },
    () => {
      memoryState.embeddings.set(record.uid, record);
    }
  );
  memoryState.embeddings.set(record.uid, record);
  await syncEmbedding(record);

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
    async (store) => {
      await store.setItem("users", next);
    },
    () => {
      memoryState.registry.set(record.uid, next[record.uid]);
    }
  );
  memoryState.registry.set(record.uid, next[record.uid]);
  await syncRegistryEntry(next[record.uid]);
};

export const getEmbedding = async (
  uid: string
): Promise<BiometricEmbedding | null> => {
  ensureStores();

  const local = await withStore(
    embeddingsStore,
    async (store) => (await store.getItem<BiometricEmbedding>(uid)) ?? null,
    () => memoryState.embeddings.get(uid) ?? null
  );
  if (local) {
    return local;
  }

  const remote = await fetchEmbeddingFromRemote(uid);
  if (remote) {
    await withStore(
      embeddingsStore,
      async (store) => {
        await store.setItem(uid, remote);
      },
      () => {
        memoryState.embeddings.set(uid, remote);
      }
    );
    memoryState.embeddings.set(uid, remote);
  }
  return remote;
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
    async (store) => {
      await store.setItem("users", registry);
    },
    () => {
      memoryState.registry.set(record.uid, registry[record.uid]);
    }
  );
  memoryState.registry.set(record.uid, registry[record.uid]);
  await syncRegistryEntry(registry[record.uid]);
};

export const listRegisteredUsers = async (): Promise<UserRegistryRecord[]> => {
  ensureStores();

  const remote = await fetchRegistryFromRemote();
  if (remote) {
    memoryState.registry.clear();
    Object.values(remote).forEach((entry) =>
      memoryState.registry.set(entry.uid, entry)
    );

    await withStore(
      registryStore,
      async (store) => {
        await store.setItem("users", remote);
      },
      () => undefined
    );

    return Object.values(remote).sort(
      (a, b) => b.updatedAt - a.updatedAt || a.uid.localeCompare(b.uid)
    );
  }

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
    async (store) => {
      await store.setItem("offline-session", payload);
    },
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
    async (store) => {
      await store.removeItem("offline-session");
    },
    () => {
      memoryState.session = null;
    }
  );
  memoryState.session = null;
};

export const deleteUserRecord = async (uid: string) => {
  ensureStores();

  memoryState.embeddings.delete(uid);
  memoryState.registry.delete(uid);

  await withStore(
    embeddingsStore,
    async (store) => {
      await store.removeItem(uid);
    },
    () => undefined
  );

  const registry = await getRegistry();
  if (registry[uid]) {
    delete registry[uid];
    await withStore(
      registryStore,
      async (store) => {
        await store.setItem("users", registry);
      },
      () => undefined
    );
  }

  const embeddingsCol = embeddingCollection();
  const registryCol = registryCollection();

  try {
    if (embeddingsCol) {
      await deleteDoc(doc(embeddingsCol, uid));
    }
    if (registryCol) {
      await deleteDoc(doc(registryCol, uid));
    }
  } catch (error) {
    console.warn("Failed to delete Firestore records", error);
  }
};

