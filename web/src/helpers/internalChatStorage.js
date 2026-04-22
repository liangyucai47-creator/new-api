const INDEX_KEY = 'internal-chat:index';
const ACTIVE_CONVERSATION_KEY = 'internal-chat:active-conversation';
const DB_NAME = 'internal-chat-db';
const DB_VERSION = 1;
const MESSAGE_STORE = 'messages';

function getLocalStorage() {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) {
    return null;
  }
  return globalThis.localStorage;
}

function readJsonStorage(key, fallbackValue) {
  const storage = getLocalStorage();
  if (!storage) {
    return fallbackValue;
  }

  const rawValue = storage.getItem(key);
  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  storage.setItem(key, JSON.stringify(value));
}

export function loadConversationIndex() {
  return readJsonStorage(INDEX_KEY, []);
}

export function saveConversationIndex(index) {
  writeJsonStorage(INDEX_KEY, index);
}

export function loadActiveConversationId() {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  return storage.getItem(ACTIVE_CONVERSATION_KEY);
}

export function saveActiveConversationId(conversationId) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  if (!conversationId) {
    storage.removeItem(ACTIVE_CONVERSATION_KEY);
    return;
  }
  storage.setItem(ACTIVE_CONVERSATION_KEY, conversationId);
}

export async function openInternalChatDB() {
  if (typeof indexedDB === 'undefined') {
    return null;
  }

  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MESSAGE_STORE)) {
        db.createObjectStore(MESSAGE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoreRecord(db, storeName, key, fallbackValue = null) {
  if (!db) {
    return fallbackValue;
  }

  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => {
      const value = request.result;
      if (!value) {
        resolve(fallbackValue);
        return;
      }
      resolve(value.messages ?? value);
    };
    request.onerror = () => reject(request.error);
  });
}

async function putStoreRecord(db, storeName, value) {
  if (!db) {
    return value;
  }

  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

export async function loadConversationMessages(conversationId) {
  const db = await openInternalChatDB();
  return await getStoreRecord(db, MESSAGE_STORE, conversationId, []);
}

export async function saveConversationMessages(conversationId, messages) {
  const db = await openInternalChatDB();
  return await putStoreRecord(db, MESSAGE_STORE, {
    id: conversationId,
    messages,
  });
}
