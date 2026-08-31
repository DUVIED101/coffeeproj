import { SUPABASE_URL } from '../config/supabase';
import {
  normaliseStorageUrlFor,
  transformedImageUrlFor,
} from '@bystrobarista/core/utils/imageUrl';

export const normaliseStorageUrl = (publicUrl: string | null | undefined): string | undefined =>
  normaliseStorageUrlFor(SUPABASE_URL, publicUrl);

export const transformedImageUrl = (
  publicUrl: string | null | undefined,
  size: number,
  quality: number = 70
): string | undefined => transformedImageUrlFor(SUPABASE_URL, publicUrl, size, quality);
