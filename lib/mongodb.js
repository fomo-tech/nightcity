import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'night_city_pixel';

let clientPromise;

export function getMongoClient() {
  if (!uri) {
    throw new Error('Missing MONGODB_URI. Copy .env.example to .env.local and set your MongoDB connection string.');
  }

  if (!globalThis._ncpxMongoClientPromise) {
    const client = new MongoClient(uri);
    globalThis._ncpxMongoClientPromise = client.connect();
  }

  clientPromise = globalThis._ncpxMongoClientPromise;
  return clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(dbName);
}
