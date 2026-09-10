import TextRecognition from '@react-native-ml-kit/text-recognition';

export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    const result = await TextRecognition.recognize(imagePath);
    return result.text || '';
  } catch (e: any) {
    throw new Error(`OCR failed: ${e.message}`);
  }
}