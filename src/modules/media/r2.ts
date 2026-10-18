import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { MediaObject, MediaStorage } from "./media";

export type R2MediaStorageConfig = {
  /** Cloudflare account id; builds the S3-compatible endpoint. */
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Public base URL the bucket is served from; keys are appended to it. */
  publicBaseUrl: string;
};

/** Adapter for Cloudflare R2's S3-compatible API. Never talks to R2 lazily: only on put/delete. */
export function createR2MediaStorage(config: R2MediaStorageConfig): MediaStorage {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const publicBaseUrl = config.publicBaseUrl.replace(/\/+$/, "");
  return {
    async put(object: MediaObject) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: object.key,
          Body: object.bytes,
          ContentType: object.contentType,
        }),
      );
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
    publicUrl(key) {
      return `${publicBaseUrl}/${key}`;
    },
  };
}

const R2_VARIABLES = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
] as const;

/**
 * Builds the real R2 adapter from environment configuration: the full variable
 * set produces the R2 adapter, an empty set means media storage is
 * unconfigured, and a partial set is a mistake to fail loudly on.
 */
export function createMediaStorageFromEnv(
  variables: Record<string, string | undefined>,
): MediaStorage | undefined {
  const values = R2_VARIABLES.map((name) => variables[name]);
  if (values.every((value) => !value)) return undefined;
  const missing = R2_VARIABLES.filter((_, index) => !values[index]);
  if (missing.length > 0) {
    throw new Error(`R2 media storage is missing required variables: ${missing.join(", ")}`);
  }
  const [accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl] = values as [
    string,
    string,
    string,
    string,
    string,
  ];
  return createR2MediaStorage({ accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl });
}
