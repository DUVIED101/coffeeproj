import {
  normaliseStorageUrlFor,
  transformedImageUrlFor,
} from "@bystrobarista/core/utils/imageUrl";
import { pickBrowserSupabaseHost } from "./supabaseHost";

export const normaliseStorageUrl = (
  publicUrl: string | null | undefined,
): string | undefined =>
  normaliseStorageUrlFor(pickBrowserSupabaseHost().url, publicUrl);

export const transformedImageUrl = (
  publicUrl: string | null | undefined,
  size: number,
  quality: number = 70,
): string | undefined =>
  transformedImageUrlFor(
    pickBrowserSupabaseHost().url,
    publicUrl,
    size,
    quality,
  );
