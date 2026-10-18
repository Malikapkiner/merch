// Public interface of the Media module. Import only from here.
export {
  FAKE_MEDIA_PUBLIC_BASE_URL,
  createFakeMediaStorage,
} from "./media";
export type { FakeMediaStorage, MediaObject, MediaStorage } from "./media";
export { createMediaStorageFromEnv, createR2MediaStorage } from "./r2";
export type { R2MediaStorageConfig } from "./r2";
