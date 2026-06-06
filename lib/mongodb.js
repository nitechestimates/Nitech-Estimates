import { MongoClient } from "mongodb";

const globalWithMongo = global;

function getClientPromise() {
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
const clientPromise = {
  then: (res, rej) => getClientPromise().then(res, rej),
  catch: (rej) => getClientPromise().catch(rej),
  finally: (fin) => getClientPromise().finally(fin),
};

export default clientPromise;