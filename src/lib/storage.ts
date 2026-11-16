import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Geymsla fyrir myndir sem stjórnandi hleður upp.
 * - Á Netlify: Netlify Blobs (site-wide store "fincafresh-uploads"), því föll þar hafa ekki varanlegan disk.
 * - Annars: public/uploads á diski.
 * Heimild: Netlify Blobs skjölun (getStore, set, get).
 */
const STORE = "fincafresh-uploads";

async function blobStore() {
  try {
    const { getStore } = await import("@netlify/blobs");
    // Kastar villu (MissingBlobsEnvironmentError) ef keyrt er utan Netlify; þá er diskurinn notaður
    return getStore({ name: STORE, consistency: "strong" });
  } catch {
    return null;
  }
}

export async function saveUpload(name: string, data: Buffer, contentType: string) {
  {
    const store = await blobStore();
    if (store) {
      const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      await store.set(name, ab, { metadata: { contentType } });
      return;
    }
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data);
}

export async function readUpload(name: string): Promise<Uint8Array | null> {
  {
    const store = await blobStore();
    if (store) {
      const v = await store.get(name, { type: "arrayBuffer" });
      return v ? new Uint8Array(v) : null;
    }
  }
  try {
    return new Uint8Array(await readFile(path.join(process.cwd(), "public", "uploads", name)));
  } catch {
    return null;
  }
}
