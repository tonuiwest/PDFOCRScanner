import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

// Downscales very large scans to a sane max width before OCR/PDF generation,
// keeping file sizes and processing time reasonable.
export const adjustImageForA4 = async (imageUri: string): Promise<string> => {
  try {
    const MAX_WIDTH = 1200;
    const imageInfo = await FileSystem.getInfoAsync(imageUri);
    if (!imageInfo.exists) return imageUri;

    const context = ImageManipulator.manipulate(imageUri).resize({ width: MAX_WIDTH });
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.95, format: SaveFormat.JPEG });
    return result.uri;
  } catch (error) {
    console.warn('Error adjusting image for A4:', error);
    return imageUri;
  }
};
