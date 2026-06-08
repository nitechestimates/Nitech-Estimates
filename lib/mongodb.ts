import { MongoClient } from "mongodb";

declare const globalThis: { _mongoClientPromise?: Promise<MongoClient> | null };

const globalWithMongo = globalThis;

function getClientPromise(): Promise<MongoClient> {
  if (globalWithMongo._mongoClientPromise) {
    return globalWithMongo._mongoClientPromise;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI is not set in environment"));
  }
  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    const promise = client.connect().then(async (connectedClient) => {
      // Proactively ensure indexes in the background
      try {
        const db = connectedClient.db("nitech_estimates");
        await Promise.all([
          db.collection("estimates").createIndex({ userId: 1, createdAt: -1 }),
          db.collection("billings").createIndex({ estimateId: 1, userId: 1 }),
          db.collection("lead_profiles").createIndex({ userId: 1, category: 1 }),
        ]);
        console.log("✓ MongoDB indexes ensured successfully");
      } catch (err) {
        console.error("Failed to build MongoDB indexes:", err);
      }
      return connectedClient;
    });
    globalWithMongo._mongoClientPromise = promise;
    // Reset cache on failure so next request can retry
    globalWithMongo._mongoClientPromise = promise.catch((err) => {
      globalWithMongo._mongoClientPromise = null;
      return Promise.reject(err);
    });
    return globalWithMongo._mongoClientPromise;
  } catch (err) {
    return Promise.reject(err);
  }
}

// Export a thenable proxy so all existing `await clientPromise` calls work
const clientPromise: PromiseLike<MongoClient> = {
  then: <TResult1 = MongoClient, TResult2 = never>(
    res?: ((value: MongoClient) => TResult1 | PromiseLike<TResult1>) | null,
    rej?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> => getClientPromise().then(res, rej),
};

export default clientPromise;