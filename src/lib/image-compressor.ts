/**
 * Client-side high-performance image compression and downscaling.
 * Prevents mobile webview OOM crashes, payload size rejections, and localStorage QuotaExceededError.
 */
export async function compressImageToDataUrl(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.82,
): Promise<{ dataUrl: string; mime: string; name: string; size: number }> {
  const fileName = file instanceof File ? file.name : "image.jpg";
  const fileMime = file.type || "image/jpeg";

  // If already small svg or tiny image, read as dataUrl directly
  if (fileMime.includes("svg") || file.size < 60 * 1024) {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return {
      dataUrl: rawDataUrl,
      mime: fileMime,
      name: fileName,
      size: file.size,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext("2d", { alpha: fileMime.includes("png") });
      if (!ctx) {
        // Fallback
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve({ dataUrl: res, mime: fileMime, name: fileName, size: file.size });
        };
        reader.readAsDataURL(file);
        return;
      }

      // Fill white background for JPEGs if needed
      const outputMime = fileMime.includes("png") ? "image/png" : "image/jpeg";
      if (outputMime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL(outputMime, quality);
      resolve({
        dataUrl: compressedDataUrl,
        mime: outputMime,
        name: fileName,
        size: Math.round((compressedDataUrl.length * 3) / 4),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve({ dataUrl: res, mime: fileMime, name: fileName, size: file.size });
      };
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}
