// Storage port for Media (image files). Implementations upload, delete and
// hand out public URLs for stored objects; tests use the fake.

export type MediaObject = {
  key: string;
  bytes: Uint8Array;
  contentType: string;
};

export type MediaStorage = {
  put(input: MediaObject): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
};

export const FAKE_MEDIA_PUBLIC_BASE_URL = "https://fake-media.test";

/** In-memory storage for tests; also lets a test inspect what was stored/deleted. */
export type FakeMediaStorage = MediaStorage & {
  objects(): MediaObject[];
  deletedKeys(): string[];
};

export function createFakeMediaStorage(options: { publicBaseUrl?: string } = {}): FakeMediaStorage {
  const publicBaseUrl = options.publicBaseUrl ?? FAKE_MEDIA_PUBLIC_BASE_URL;
  const stored: MediaObject[] = [];
  const deleted: string[] = [];
  return {
    async put(input) {
      stored.push({ ...input });
    },
    async delete(key) {
      deleted.push(key);
    },
    publicUrl(key) {
      return `${publicBaseUrl}/${key}`;
    },
    objects() {
      return stored;
    },
    deletedKeys() {
      return deleted;
    },
  };
}
