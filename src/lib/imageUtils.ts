/**
 * Transform a Supabase Storage URL to request a resized version.
 * Falls back to the original URL if it's not a storage URL.
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return url;

  // Only transform Supabase storage URLs
  const storagePattern = /\/storage\/v1\/object\/public\//;
  if (!storagePattern.test(url)) return url;

  // Replace /object/ with /render/image/ for transformation
  const transformedUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const params = new URLSearchParams({
    width: String(width),
    resize: "cover",
    quality: String(quality),
  });

  if (height) {
    params.set("height", String(height));
  }

  const separator = transformedUrl.includes("?") ? "&" : "?";
  return `${transformedUrl}${separator}${params.toString()}`;
}
