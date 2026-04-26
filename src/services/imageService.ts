import { removeBackground as imglyRemoveBackground, Config } from "@imgly/background-removal";
import { ImageFilters } from "./geminiService";

export async function removeBackground(imageSource: string | File | Blob | HTMLImageElement): Promise<Blob> {
  const config: Config = {
    progress: (key, current, total) => {
      // console.log(`Downloading ${key}: ${current}/${total}`);
    },
    // We can specify model paths here if needed, but defaults usually work fine 
    // unless the environment restricts external fetches.
  };

  try {
    return await imglyRemoveBackground(imageSource, config);
  } catch (error) {
    console.error("Background removal failed:", error);
    throw error;
  }
}

export async function processImage(
  imageSource: Blob | string,
  filters: ImageFilters
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Fill background if specified
      if (filters.backgroundColor && filters.backgroundColor !== 'transparent') {
        ctx.fillStyle = filters.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Apply filters via context
      ctx.filter = `
        brightness(${filters.brightness}) 
        contrast(${filters.contrast}) 
        saturate(${filters.saturate}) 
        blur(${filters.blur || 0}px) 
        grayscale(${filters.grayscale || 0}) 
        sepia(${filters.sepia || 0}) 
        hue-rotate(${filters.hueRotate || 0}deg)
      `;

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
  });
}
