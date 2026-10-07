import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

export { TextRecognitionScript };
export type OcrScript = `${TextRecognitionScript}`;
const SCRIPT_KEY = 'pref_ocr_script';

/** Picks the recognition model that matches the device language. */
function defaultScript(): TextRecognitionScript {
  const lang = getLocales()[0]?.languageCode ?? 'en';
  if (['hi', 'mr', 'ne', 'sa', 'kok', 'mai', 'bho'].includes(lang)) return TextRecognitionScript.DEVANAGARI;
  if (lang === 'zh') return TextRecognitionScript.CHINESE;
  if (lang === 'ja') return TextRecognitionScript.JAPANESE;
  if (lang === 'ko') return TextRecognitionScript.KOREAN;
  return TextRecognitionScript.LATIN;
}

let script: TextRecognitionScript = defaultScript();
AsyncStorage.getItem(SCRIPT_KEY)
  .then((v) => { if (v && (Object.values(TextRecognitionScript) as string[]).includes(v)) script = v as TextRecognitionScript; })
  .catch(() => {});

export const getOcrScript = () => script;
export function setOcrScript(next: TextRecognitionScript) {
  script = next;
  AsyncStorage.setItem(SCRIPT_KEY, next).catch(() => {});
}

export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    const result = await TextRecognition.recognize(imagePath, script);
    let text = (result.text || '').trim();
    // Non-Latin models also read Latin characters, but the Latin model can't read other scripts.
    // If a non-Latin model found nothing, retry with Latin so mixed documents still work.
    if (!text && script !== TextRecognitionScript.LATIN) {
      text = ((await TextRecognition.recognize(imagePath, TextRecognitionScript.LATIN)).text || '').trim();
    }
    return text;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Text recognition failed');
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
    if (text) parts.push(uris.length > 1 ? `— ${i + 1} —\n${text}` : text);
    onProgress?.(i + 1, uris.length);
  }
  return parts.join('\n\n');
}
