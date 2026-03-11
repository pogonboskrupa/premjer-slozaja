import { openDB, type IDBPDatabase } from 'idb'
import type { Measurement } from '../types'

const DB_NAME = 'premjer-slozaja-db'
const DB_VERSION = 1
const STORE = 'measurements'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
          store.createIndex('location', 'location')
          store.createIndex('woodType', 'woodType')
        }
      }
    })
  }
  return dbPromise!
}

export async function saveMeasurement(measurement: Measurement): Promise<void> {
  const db = await getDB()
  await db.put(STORE, measurement)
}

export async function getAllMeasurements(): Promise<Measurement[]> {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getMeasurement(id: string): Promise<Measurement | undefined> {
  const db = await getDB()
  return db.get(STORE, id)
}

export async function deleteMeasurement(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function updateMeasurement(measurement: Measurement): Promise<void> {
  const db = await getDB()
  await db.put(STORE, { ...measurement, updatedAt: new Date().toISOString() })
}

export async function clearAllMeasurements(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE)
}
