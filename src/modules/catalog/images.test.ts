import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createFakeMediaStorage } from "../media";
import { createCatalog } from "./index";

const testDb = openTestDatabase();

function pngBytes(): Uint8Array {
  // Minimal PNG: 8-byte signature followed by placeholder chunk bytes.
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
}

function jpegBytes(): Uint8Array {
  // Minimal JPEG: SOI + APP0 marker bytes.
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
}

function gif(): Uint8Array {
  // "GIF89a" header.
  return new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
}

beforeEach(() => testDb.truncateAll());
afterAll(() => testDb.close());

describe("Product images", () => {
  it("shows the first uploaded image as the listing cover", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });

    await catalog.addProductImages(product.id, [pngBytes(), jpegBytes()]);

    const [listed] = await catalog.listProducts();
    const firstStoredKey = storage.objects()[0].key;
    expect(listed.coverImage?.url).toBe(`https://media.example.test/${firstStoredKey}`);
  });

  it("returns the product detail images in upload order", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });

    await catalog.addProductImages(product.id, [pngBytes(), jpegBytes(), pngBytes()]);

    const detail = await catalog.getProduct("erken-hasat");
    const storedKeys = storage.objects().map((object) => object.key);
    expect(detail?.images.map((image) => image.url)).toEqual([
      `https://media.example.test/${storedKeys[0]}`,
      `https://media.example.test/${storedKeys[1]}`,
      `https://media.example.test/${storedKeys[2]}`,
    ]);
  });

  it("shows the images to the admin on the product edit read", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });

    await catalog.addProductImages(product.id, [jpegBytes()]);

    const adminProduct = await catalog.getProductForAdmin(product.id);
    const storedKeys = storage.objects().map((object) => object.key);
    expect(adminProduct?.images.map((image) => image.url)).toEqual([
      `https://media.example.test/${storedKeys[0]}`,
    ]);
  });

  it("accepts WebP images", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    await catalog.addProductImages(product.id, [webp]);

    const [listed] = await catalog.listProducts();
    expect(listed.coverImage).not.toBeNull();
    expect(storage.objects()).toHaveLength(1);
  });

  it("rejects files that are not JPEG, PNG or WebP without uploading anything", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);

    await expect(catalog.addProductImages(product.id, [gif])).rejects.toThrow(/Unsupported image type/);
    expect(storage.objects()).toHaveLength(0);
  });

  it("rejects a spoofed file that is not an image despite an image-like name", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    const plainText = new TextEncoder().encode("not an image");

    await expect(catalog.addProductImages(product.id, [plainText])).rejects.toThrow(/Unsupported image type/);
    expect(storage.objects()).toHaveLength(0);
  });

  it("rejects images larger than 5 MB without uploading anything", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    // A valid JPEG header followed by more than 5 MB of pixel data.
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set(jpegBytes().slice(0, 4));

    await expect(catalog.addProductImages(product.id, [oversized])).rejects.toThrow(/5 MB/);
    expect(storage.objects()).toHaveLength(0);
  });

  it("rejects the whole batch when one image is invalid, uploading none of them", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });

    await expect(catalog.addProductImages(product.id, [pngBytes(), gif()])).rejects.toThrow(/Unsupported image type/);
    expect(storage.objects()).toHaveLength(0);
  });

  it("moves an image up so it becomes the listing cover", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    await catalog.addProductImages(product.id, [pngBytes(), jpegBytes()]);

    const [before] = await catalog.listProducts();
    const movedFrom = before.coverImage?.id;
    const detail = await catalog.getProduct("erken-hasat");
    const secondImage = detail?.images[1];
    if (!movedFrom || !secondImage) throw new Error("images missing");

    await catalog.moveProductImage(secondImage.id, "up");

    const [listed] = await catalog.listProducts();
    expect(listed.coverImage?.id).toBe(secondImage.id);
    expect(listed.coverImage?.id).not.toBe(movedFrom);
  });

  it("moves the first image down so the second covers the listing", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    await catalog.addProductImages(product.id, [pngBytes(), jpegBytes()]);

    const detail = await catalog.getProduct("erken-hasat");
    const firstImage = detail?.images[0];
    const secondImage = detail?.images[1];
    if (!firstImage || !secondImage) throw new Error("images missing");

    await catalog.moveProductImage(firstImage.id, "down");

    const [listed] = await catalog.listProducts();
    expect(listed.coverImage?.id).toBe(secondImage.id);
  });

  it("deletes an image, removes its object from storage and keeps the rest in order", async () => {
    const storage = createFakeMediaStorage({ publicBaseUrl: "https://media.example.test" });
    const catalog = createCatalog(testDb.db, { storage });
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    await catalog.addProductImages(product.id, [pngBytes(), jpegBytes(), pngBytes()]);

    const detail = await catalog.getProduct("erken-hasat");
    const firstImage = detail?.images[0];
    if (!firstImage) throw new Error("images missing");

    await catalog.deleteProductImage(firstImage.id);

    const storedKeys = storage.objects().map((object) => object.key);
    expect(storage.deletedKeys()).toEqual([storedKeys[0]]);
    const after = await catalog.getProduct("erken-hasat");
    expect(after?.images.map((image) => image.url)).toEqual([
      `https://media.example.test/${storedKeys[1]}`,
      `https://media.example.test/${storedKeys[2]}`,
    ]);
  });
});
