import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

// Exported as a function so callers always get a fresh attempt if a prior
// connection failed (e.g. DB was paused and woke up after the container started).
export default function getClient(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not set.'));
  }

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      // Clear cache so the next request retries instead of reusing a stale rejection
      globalWithMongo._mongoClientPromise = undefined;
      throw err;
    });
  }

  return globalWithMongo._mongoClientPromise;
}
