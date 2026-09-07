#!/usr/bin/env node
// Copy every Storage object from the cloud project to the self-hosted stack.
// Buckets and object metadata already arrive with the database dump; this
// moves the bytes and upserts each object so its row points at the new file.
//
//   SRC_URL=https://zifvfsamfzepxxuxhyhg.supabase.co SRC_KEY=<cloud service_role> \
//   DST_URL=https://api.bystrobarista.com            DST_KEY=<self-hosted service_role> \
//     node infra/supabase-selfhost/scripts/copy-storage.mjs
//
// Idempotent: re-running re-uploads (upsert) — fine for ~200 files / 70 MB.

import { createClient } from "@supabase/supabase-js";

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
};

const src = createClient(env("SRC_URL"), env("SRC_KEY"), {
  auth: { persistSession: false },
});
const dst = createClient(env("DST_URL"), env("DST_KEY"), {
  auth: { persistSession: false },
});

async function listAll(client, bucket, prefix = "") {
  const files = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null)
        files.push(...(await listAll(client, bucket, path)));
      else
        files.push({
          path,
          mimetype: item.metadata?.mimetype,
          cacheControl: item.metadata?.cacheControl,
        });
    }
    if (data.length < pageSize) break;
  }
  return files;
}

const { data: buckets, error: bucketsError } = await src.storage.listBuckets();
if (bucketsError) throw bucketsError;
const { data: dstBuckets } = await dst.storage.listBuckets();
const dstBucketIds = new Set((dstBuckets ?? []).map((b) => b.id));

let copied = 0;
let failed = 0;
for (const bucket of buckets) {
  if (!dstBucketIds.has(bucket.id)) {
    const { error } = await dst.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit ?? undefined,
      allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
    });
    if (error) throw new Error(`createBucket ${bucket.id}: ${error.message}`);
    console.log(`created bucket ${bucket.id}`);
  }
  const files = await listAll(src, bucket.id);
  console.log(`${bucket.id}: ${files.length} objects`);
  for (const file of files) {
    const { data: blob, error: downloadError } = await src.storage
      .from(bucket.id)
      .download(file.path);
    if (downloadError) {
      failed += 1;
      console.error(
        `  FAIL download ${bucket.id}/${file.path}: ${downloadError.message}`,
      );
      continue;
    }
    const { error: uploadError } = await dst.storage
      .from(bucket.id)
      .upload(file.path, blob, {
        contentType: file.mimetype ?? blob.type ?? "application/octet-stream",
        cacheControl: (file.cacheControl ?? "max-age=31536000").replace(
          /^max-age=/,
          "",
        ),
        upsert: true,
      });
    if (uploadError) {
      failed += 1;
      console.error(
        `  FAIL upload ${bucket.id}/${file.path}: ${uploadError.message}`,
      );
      continue;
    }
    copied += 1;
  }
}
console.log(`done: ${copied} copied, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
