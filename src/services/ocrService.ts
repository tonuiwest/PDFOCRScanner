import TextRecognition from '@react-native-ml-kit/text-recognition';

export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    const result = await TextRecognition.recognize(imagePath);
    return (result.text || '').trim();
  } catch (e: any) {
    throw new Error(`Text recognition failed: ${e?.message ?? 'unknown error'}`);
  }
}

/** Runs OCR page by page and joins the results with page separators. */
export async function extractTextFromPages(
  uris: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const parts: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const text = await extractTextFromImage(uris[i]);
    if (text) parts.push(uris.length > 1 ? `— Page ${i + 1} —\n${text}` : text);
    onProgress?.(i + 1, uris.length);
  }
  return parts.join('\n\n');
}
