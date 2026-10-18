import { createMediaStorageFromEnv } from "@/modules/media";
import type { MediaStorage } from "@/modules/media";

let warnedPartiallyConfigured = false;

/**
 * Media storage bound to the app configuration: the R2 adapter once every
 * R2_ variable is set, undefined until then. A partial configuration logs an
 * error once and stays disabled, so catalog reads keep working without media.
 */
export function mediaStorage(): MediaStorage | undefined {
  try {
    return createMediaStorageFromEnv(process.env);
  } catch (error) {
    if (!warnedPartiallyConfigured) {
      warnedPartiallyConfigured = true;
      console.error(
        "R2 media storage is partially configured; uploads stay disabled until every variable is set.",
        error,
      );
    }
    return undefined;
  }
}
