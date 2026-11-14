import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface StoredPresentation {
  id: string;
  name: string;
  size: number;
  slideCount: number;
  pdfData: ArrayBuffer;
  thumbnail?: string; // Data URL or canvas capture of first slide
  createdAt: number;
  lastOpenedAt: number;
}

export interface PresentationHistoryItem {
  id: string;
  presentationId: string;
  presentationName: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  slidesPresented: number;
  pairedDeviceCount: number;
}

interface SimplyPPTDB extends DBSchema {
  presentations: {
    key: string;
    value: StoredPresentation;
    indexes: { 'by-last-opened': number };
  };
  history: {
    key: string;
    value: PresentationHistoryItem;
    indexes: { 'by-started': number; 'by-presentation': string };
  };
}

const DB_NAME = 'simply_ppt_local_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SimplyPPTDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SimplyPPTDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only accessible in browser environment.'));
  }

  if (!dbPromise) {
    dbPromise = openDB<SimplyPPTDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('presentations')) {
          const presStore = db.createObjectStore('presentations', { keyPath: 'id' });
          presStore.createIndex('by-last-opened', 'lastOpenedAt');
        }
        if (!db.objectStoreNames.contains('history')) {
          const histStore = db.createObjectStore('history', { keyPath: 'id' });
          histStore.createIndex('by-started', 'startedAt');
          histStore.createIndex('by-presentation', 'presentationId');
        }
      },
    });
  }

  return dbPromise;
}

export async function savePresentation(
  id: string,
  name: string,
  size: number,
  slideCount: number,
  pdfData: ArrayBuffer,
  thumbnail?: string
): Promise<StoredPresentation> {
  const db = await getDB();
  const existing = await db.get('presentations', id);

  const presentation: StoredPresentation = {
    id,
    name,
    size,
    slideCount,
    pdfData,
    thumbnail: thumbnail || existing?.thumbnail,
    createdAt: existing?.createdAt || Date.now(),
    lastOpenedAt: Date.now(),
  };

  await db.put('presentations', presentation);
  return presentation;
}

export async function getPresentation(id: string): Promise<StoredPresentation | undefined> {
  const db = await getDB();
  return db.get('presentations', id);
}

export async function getAllPresentations(): Promise<StoredPresentation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('presentations', 'by-last-opened');
  return all.reverse(); // Most recent first
}

export async function deletePresentation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('presentations', id);
}

export async function recordPresentationSession(session: Omit<PresentationHistoryItem, 'id'>): Promise<string> {
  const db = await getDB();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist_${Date.now()}`;
  const record: PresentationHistoryItem = {
    ...session,
    id,
  };
  await db.put('history', record);
  return id;
}

export async function getPresentationHistory(): Promise<PresentationHistoryItem[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('history', 'by-started');
  return all.reverse();
}
