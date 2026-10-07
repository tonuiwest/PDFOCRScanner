import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActionSheet, PromptModal, SheetAction, useToast } from '../components/ui';
import {
  ScanDocument, deleteDocument, listDocuments, shareableCopy, subscribeDocuments, updateDocument,
} from '../services/documents';
import { leavingApp } from '../services/capture';
import { adsManager } from '../services/adsManager';
import type { RootStackParamList } from '../navigation';

export function useDocuments() {
  const [docs, setDocs] = useState<ScanDocument[] | null>(null);
  useEffect(() => {
    const load = () => listDocuments().then(setDocs).catch(() => setDocs([]));
    load();
    return subscribeDocuments(load);
  }, []);
  return docs;
}

export async function openDocument(doc: ScanDocument) {
  try {
    await leavingApp(() => FileViewer.open(doc.uri, { showOpenWithDialog: true, displayName: `${doc.name}.pdf` }));
    adsManager.maybeShowInterstitial();
  } catch {
    Alert.alert('No PDF viewer found', 'Install a PDF viewer app, or use Share to send the file to another app.');
  }
}

export async function shareDocument(doc: ScanDocument) {
  try {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
    const uri = await shareableCopy(doc);
    await leavingApp(() => Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.name }));
    adsManager.maybeShowInterstitial();
  } catch (e: any) {
    Alert.alert('Could not share', e?.message ?? 'Unknown error');
  }
}

/** Options sheet + rename dialog for a document. Render `element` once in the screen. */
export function useDocumentActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const [target, setTarget] = useState<ScanDocument | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [renaming, setRenaming] = useState<ScanDocument | null>(null);

  const showOptions = useCallback((doc: ScanDocument) => { setTarget(doc); setSheetOpen(true); }, []);

  const confirmDelete = (doc: ScanDocument) =>
    Alert.alert('Delete document?', `"${doc.name}" will be permanently removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDocument(doc.id); toast('Document deleted', 'trash'); } },
    ]);

  const actions: SheetAction[] = target ? [
    { label: 'Open', icon: 'eye', tint: '#3B82F6', onPress: () => openDocument(target) },
    { label: 'Share PDF', icon: 'share-social', tint: '#10B981', onPress: () => shareDocument(target) },
    ...(target.ocrText ? [{
      label: 'View extracted text', icon: 'document-text' as const, tint: '#8B5CF6',
      onPress: () => navigation.navigate('Text', { text: target.ocrText!, title: target.name, docId: target.id }),
    }] : []),
    { label: 'Rename', icon: 'pencil', tint: '#F59E0B', onPress: () => setRenaming(target) },
    { label: 'Delete', icon: 'trash', destructive: true, onPress: () => confirmDelete(target) },
  ] : [];

  const element = (
    <>
      <ActionSheet visible={sheetOpen} title={target?.name} actions={actions} onClose={() => setSheetOpen(false)} />
      <PromptModal
        visible={!!renaming}
        title="Rename document"
        initialValue={renaming?.name ?? ''}
        onClose={() => setRenaming(null)}
        onSubmit={async (name) => { if (renaming) { await updateDocument(renaming.id, { name }); toast('Renamed'); } }}
      />
    </>
  );

  return { showOptions, element };
}
