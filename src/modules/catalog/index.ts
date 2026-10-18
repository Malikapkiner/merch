// Public interface of the Catalog module. Import only from here.
export { MAX_PRODUCT_IMAGE_BYTES, createCatalog, ProductImageError } from "./catalog";
export type {
  AdminProduct,
  AdminVariant,
  Catalog,
  CatalogOptions,
  Category,
  Product,
  ProductDetail,
  ProductImage,
  ProductImageErrorReason,
  Variant,
  VariantWithProduct,
} from "./catalog";
