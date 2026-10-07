import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface ScanDocument {
  id: string;
  name: string;
  uri: string; // PDF file
  thumb?: string; // first page JPEG
  pages: number;
  size: number;
  createdAt: string;
  ocrText?: string;
}

export type PageSize = 'A4' | 'Letter';
export type ExportQuality = 'standard' | 'hd';

const KEY = 'documents_v2';
const LEGACY_KEY = 'pdf_library';
const DIR = `${FileSystem.documentDirectory}docs/`;

let cache: ScanDocument[] | null = null;
const listeners = new Set<() => void>();
export const subscribeDocuments = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

async function persist(list: ScanDocument[]) {
  cache = list;
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  listeners.forEach((l) => l());
}

let loading: Promise<ScanDocument[]> | null = null;
export function listDocuments(): Promise<ScanDocument[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) loading = loadDocuments().finally(() => { loading = null; });
  return loading;
}

async function loadDocuments(): Promise<ScanDocument[]> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    cache = JSON.parse(raw);
    return cache!;
  }
  // One-time migration from the 1.0 library format.
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  const migrated: ScanDocument[] = [];
  if (legacy) {
    for (const item of JSON.parse(legacy) as any[]) {
      const info = await FileSystem.getInfoAsync(item.uri);
      if (!info.exists) continue;
      migrated.push({
        id: `${new Date(item.date).getTime()}-${migrated.length}`,
        name: String(item.name ?? 'Scan').replace(/\.pdf$/i, ''),
        uri: item.uri,
        pages: 0,
        size: (info as any).size ?? 0,
        createdAt: item.date ?? new Date().toISOString(),
      });
    }
  }
  await persist(migrated);
  await AsyncStorage.multiRemove([LEGACY_KEY, 'scan_history']);
  return migrated;
}

export async function getDocument(id: string) {
  return (await listDocuments()).find((d) => d.id === id);
}

export function defaultDocName(date = new Date()) {
  const d = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const t = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `Scan ${d} ${t}`;
}

const safeFileName = (name: string) => name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Scan';

async function toDataUri(uri: string, width: number) {
  const probe = await ImageManipulator.manipulate(uri).renderAsync();
  const img = probe.width > width ? await ImageManipulator.manipulate(uri).resize({ width }).renderAsync() : probe;
  const out = await img.saveAsync({ compress: width > 1600 ? 0.92 : 0.82, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}

/** Renders page images into a PDF file in the cache directory. */
export async function renderPdf(pages: string[], opts: { pageSize: PageSize; quality: ExportQuality }) {
  const width = opts.quality === 'hd' ? 2200 : 1400;
  const images: string[] = [];
  for (const p of pages) images.push(await toDataUri(p, width)); // sequential keeps memory bounded
  const size = opts.pageSize === 'Letter' ? 'letter' : 'A4';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${size};margin:0}html,body{margin:0;padding:0}
    .p{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;page-break-after:always;overflow:hidden}
    .p:last-child{page-break-after:auto}img{max-width:100%;max-height:100%;object-fit:contain}
  </style></head><body>${images.map((s) => `<div class="p"><img src="${s}"/></div>`).join('')}</body></html>`;
  const { uri } = await Print.printToFileAsync({
    html,
    width: opts.pageSize === 'Letter' ? 612 : 595,
    height: opts.pageSize === 'Letter' ? 792 : 842,
  });
  return uri;
}

export async function saveDocument(input: {
  name: string; pages: string[]; pageSize: PageSize; quality: ExportQuality; ocrText?: string;
}): Promise<ScanDocument> {
  await ensureDir();
  const id = `${Date.now()}`;
  const tmp = await renderPdf(input.pages, input);
  const uri = `${DIR}${safeFileName(input.name)}_${id}.pdf`;
  await FileSystem.moveAsync({ from: tmp, to: uri });

  let thumb: string | undefined;
  try {
    const ctx = ImageManipulator.manipulate(input.pages[0]).resize({ width: 360 });
    const img = await (await ctx.renderAsync()).saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    thumb = `${DIR}${id}_thumb.jpg`;
    await FileSystem.moveAsync({ from: img.uri, to: thumb });
  } catch { thumb = undefined; }

  const info = await FileSystem.getInfoAsync(uri);
  const doc: ScanDocument = {
    id,
    name: input.name.trim() || defaultDocName(),
    uri,
    thumb,
    pages: input.pages.length,
    size: (info as any).size ?? 0,
    createdAt: new Date().toISOString(),
    ocrText: input.ocrText || undefined,
  };
  await persist([doc, ...(await listDocuments())]);
  return doc;
}

export async function updateDocument(id: string, patch: Partial<Pick<ScanDocument, 'name' | 'ocrText'>>) {
  const list = await listDocuments();
  await persist(list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export async function deleteDocument(id: string) {
  const list = await listDocuments();
  const doc = list.find((d) => d.id === id);
  if (doc) {
    await FileSystem.deleteAsync(doc.uri, { idempotent: true });
    if (doc.thumb) await FileSystem.deleteAsync(doc.thumb, { idempotent: true });
  }
  await persist(list.filter((d) => d.id !== id));
}

export async function deleteAllDocuments() {
  await FileSystem.deleteAsync(DIR, { idempotent: true });
  for (const d of await listDocuments()) await FileSystem.deleteAsync(d.uri, { idempotent: true });
  await persist([]);
}

/** Copies the PDF to a cache file named after the document so share targets see a friendly filename. */
export async function shareableCopy(doc: ScanDocument) {
  const target = `${FileSystem.cacheDirectory}${safeFileName(doc.name)}.pdf`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from: doc.uri, to: target });
  return target;
}

export async function writeTextFile(name: string, text: string) {
  const target = `${FileSystem.cacheDirectory}${safeFileName(name)}.txt`;
  await FileSystem.writeAsStringAsync(target, text);
  return target;
}

export function formatBytes(n: number) {
  if (!n) return '0 KB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? 'Yesterday' : `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
