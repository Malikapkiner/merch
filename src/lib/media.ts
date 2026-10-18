import { createMediaStorageFromEnv } from "@/modules/media";
import type { MediaStorage } from "@/modules/media";

/**
 * Media storage bound to the app configuration: the R2 adapter once every
 * R2_ variable is set, undefined until then. A partial configuration fails
 * loudly by design.
 */
export function mediaStorage(): MediaStorage | undefined {
  return createMediaStorageFromEnv(process.env);
}
