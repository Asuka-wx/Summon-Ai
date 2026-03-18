export const AvatarUploadConfig = {
  maxSize: 2 * 1024 * 1024,
  acceptTypes: ["image/jpeg", "image/png", "image/webp"],
  maxDimension: 1024,
} as const;

export const FeedbackUploadConfig = {
  maxSize: 5 * 1024 * 1024,
  acceptTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxDimension: 4096,
} as const;

type UploadConfig = {
  maxSize: number;
  acceptTypes: readonly string[];
  maxDimension: number;
};

type ImageDimensions = {
  width: number;
  height: number;
};

function validateFile(file: File, config: UploadConfig, label: string) {
  if (!config.acceptTypes.includes(file.type)) {
    return `${label} format is not supported.`;
  }

  if (file.size > config.maxSize) {
    return `${label} exceeds the maximum file size.`;
  }

  return null;
}

export function validateAvatarFile(file: File) {
  return validateFile(file, AvatarUploadConfig, "Avatar");
}

export function validateFeedbackFile(file: File) {
  return validateFile(file, FeedbackUploadConfig, "Feedback screenshot");
}

export function validateImageDimensions(
  dimensions: ImageDimensions,
  config: UploadConfig,
) {
  if (
    dimensions.width > config.maxDimension ||
    dimensions.height > config.maxDimension
  ) {
    return `Image dimensions must be within ${config.maxDimension}×${config.maxDimension}.`;
  }

  return null;
}

export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.onerror = () => {
        reject(new Error("Unable to read image dimensions."));
      };

      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
