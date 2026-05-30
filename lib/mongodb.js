import { MongoClient } from "mongodb";

let _promise = null;

function getClientPromise() {
  if (_promise) return _promise;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    _promise = Promise.reject(new Error("MONGODB_URI is not set in environment"));
    return _promise;
  }
  try {
    const client = new MongoClient(uri);
    _promise = client.connect();
    return _promise;
  } catch (err) {
    _promise = Promise.reject(err);
    return _promise;
  }
}

// Export a thenable proxy so all existing `await clientPromise` calls work
const clientPromise = {
  then: (res, rej) => getClientPromise().then(res, rej),
  catch: (rej) => getClientPromise().catch(rej),
  finally: (fin) => getClientPromise().finally(fin),
};

export default clientPromise;