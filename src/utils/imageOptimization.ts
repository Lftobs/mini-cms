/**
 * Image optimization utility for compressing and resizing images before upload
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "image/jpeg" | "image/png" | "image/webp";
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: "image/jpeg",
};

/**
 * Compress and resize an image file
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {},
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = calculateDimensions(
        img.width,
        img.height,
        opts.maxWidth!,
        opts.maxHeight!,
      );

      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        opts.format,
        opts.quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let width = origWidth;
  let height = origHeight;

  // Scale down if larger than max dimensions
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width, height };
}

/**
 * Convert a Blob to Base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      resolve(base64.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get optimal format based on file type
 */
export function getOptimalFormat(
  file: File,
): "image/jpeg" | "image/png" | "image/webp" {
  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    // Check if browser supports WebP
    const canvas = document.createElement("canvas");
    if (canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0) {
      return "image/webp";
    }
    return "image/jpeg";
  }

  if (file.type === "image/png") {
    return "image/png";
  }

  return "image/jpeg";
}

/**
 * Generate a unique filename for uploaded image
 */
export function generateImageFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";

  const finalExtension =
    extension === "jpg" || extension === "jpeg" ? "webp" : extension;

  return `${timestamp}-${random}.${finalExtension}`;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Process multiple images in parallel
 */
export async function processImages(
  files: File[],
  options?: ImageOptimizationOptions,
): Promise<{ file: File; optimized: Blob; originalName: string }[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      const format = getOptimalFormat(file);
      const optimized = await optimizeImage(file, { ...options, format });
      return { file, optimized, originalName: file.name };
    }),
  );

  return results;
}
