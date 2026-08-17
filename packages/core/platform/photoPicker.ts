export type PickedAsset = {
  uri: string;
  fileSize?: number;
  type?: string;
  fileName?: string;
};

export type PhotoRejection = 'tooLarge' | 'invalidFormat';

export type PickResult = {
  accepted: PickedAsset[];
  rejections: PhotoRejection[];
};

export type PickPhotosOptions = {
  selectionLimit?: number;
  quality?: number;
};

export type PhotoPickerAdapter = {
  // null when the user cancels the picker (distinct from an empty accepted[]).
  pick(options: PickPhotosOptions): Promise<PickResult | null>;
  // Reads a local URI into an ArrayBuffer for Supabase Storage upload.
  readAsArrayBuffer(uri: string): Promise<ArrayBuffer>;
};
