import type {
  PhotoPickerAdapter,
  PickedAsset,
  PickResult,
  PhotoRejection,
} from "@bystrobarista/core/platform/photoPicker";
import { validateImageAsset } from "@bystrobarista/core/utils/storagePaths";

// Mirrors the mobile cap: modern phone cameras shoot 4032×3024; 2000px on the
// longest side keeps thumbnails sharp while shrinking uploads to ~400-800 KB.
const MAX_UPLOAD_DIMENSION = 2000;
const JPEG_QUALITY = 0.8;

const openFileDialog = (multiple: boolean): Promise<File[] | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = () =>
      resolve(input.files ? Array.from(input.files) : null);
    // No reliable cancel event across browsers; window refocus without a
    // change event is treated as cancel after a grace period.
    input.oncancel = () => resolve(null);
    input.click();
  });

// Downscale + JPEG-re-encode through a canvas, mirroring what
// react-native-image-crop-picker does on iOS (forceJpg + max dimensions).
const compressToJpeg = async (
  file: File,
): Promise<{ blob: Blob; url: string } | null> => {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_UPLOAD_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return null;
    return { blob, url: URL.createObjectURL(blob) };
  } catch {
    return null;
  }
};

// blob: object URLs handed out by pick() are resolved back to their Blob for
// upload. Kept in a map because fetch(blobUrl) is blocked in some privacy
// modes and revocation timing is ours to control.
const blobRegistry = new Map<string, Blob>();

export const webPhotoPicker: PhotoPickerAdapter = {
  async pick(options) {
    const max = Math.max(1, options.selectionLimit ?? 1);
    const files = await openFileDialog(max > 1);
    if (!files || files.length === 0) return null;

    const accepted: PickedAsset[] = [];
    const rejections: PhotoRejection[] = [];
    for (const file of files.slice(0, max)) {
      const compressed = await compressToJpeg(file);
      if (!compressed) {
        rejections.push("invalidFormat");
        continue;
      }
      const asset: PickedAsset = {
        uri: compressed.url,
        fileSize: compressed.blob.size,
        type: "image/jpeg",
        fileName: file.name.replace(/\.[a-z0-9]+$/i, ".jpg"),
      };
      const reason = validateImageAsset(asset);
      if (reason) {
        rejections.push(reason);
        URL.revokeObjectURL(compressed.url);
        continue;
      }
      blobRegistry.set(compressed.url, compressed.blob);
      accepted.push(asset);
    }
    const result: PickResult = { accepted, rejections };
    return result;
  },

  async readAsArrayBuffer(uri) {
    const registered = blobRegistry.get(uri);
    if (registered) {
      // Keep the registry entry and the object URL alive: the caller may
      // retry the upload after a network failure, and the URI may still be
      // rendered as a preview. A few MB per picked photo until navigation
      // is an acceptable cost for a working retry.
      return registered.arrayBuffer();
    }
    const response = await fetch(uri);
    if (!response.ok)
      throw new Error(`Failed to read ${uri.split(":")[0]} URI`);
    return response.arrayBuffer();
  },
};
