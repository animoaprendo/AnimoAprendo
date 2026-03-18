import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const primaryUri = process.env.MONGODB_URI;
const fallbackUri = process.env.MONGODB_URI_FALLBACK;
const options = {
  appName: "animoaprendo",
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

type MongoCache = {
  clientPromise?: Promise<MongoClient>;
};

const globalWithMongo = global as typeof globalThis & {
  _mongo?: MongoCache;
};

if (!globalWithMongo._mongo) {
  globalWithMongo._mongo = {};
}

function isSrvDnsRefusedError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "ECONNREFUSED" &&
    "syscall" in error &&
    (error as { syscall?: string }).syscall === "querySrv"
  );
}

async function connectWithUri(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri, options);
  await client.connect();
  return client;
}

async function createClientPromise(): Promise<MongoClient> {
  try {
    return await connectWithUri(primaryUri);
  } catch (error) {
    if (isSrvDnsRefusedError(error) && fallbackUri) {
      console.warn(
        "Mongo SRV lookup failed with ECONNREFUSED (querySrv). Falling back to MONGODB_URI_FALLBACK."
      );
      return connectWithUri(fallbackUri);
    }

    if (isSrvDnsRefusedError(error) && !fallbackUri) {
      throw new Error(
        'MongoDB SRV DNS lookup failed (ECONNREFUSED querySrv). Add MONGODB_URI_FALLBACK with a non-SRV mongodb:// URI or fix DNS/network access to Atlas.'
      );
    }

    throw error;
  }
}

if (!globalWithMongo._mongo.clientPromise) {
  globalWithMongo._mongo.clientPromise = createClientPromise();
}

const clientPromise = globalWithMongo._mongo.clientPromise;

export default clientPromise;