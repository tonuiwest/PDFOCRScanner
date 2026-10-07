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
import { t } from '../i18n';

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
    Alert.alert(t('noViewerTitle'), t('noViewerBody'));
  }
}

export async function shareDocument(doc: ScanDocument) {
  try {
    if (!(await Sharing.isAvailableAsync())) throw new Error(t('sharingUnavailable'));
    const uri = await shareableCopy(doc);
    await leavingApp(() => Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.name }));
    adsManager.maybeShowInterstitial();
  } catch (e: any) {
    Alert.alert(t('shareFailed'), e?.message ?? t('unknownError'));
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
    Alert.alert(t('deleteDocTitle'), t('deleteDocBody', { name: doc.name }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteDocument(doc.id); toast(t('docDeleted'), 'trash'); } },
    ]);

  const actions: SheetAction[] = target ? [
    { label: t('open'), icon: 'eye', tint: '#3B82F6', onPress: () => openDocument(target) },
    { label: t('sharePdf'), icon: 'share-social', tint: '#10B981', onPress: () => shareDocument(target) },
    ...(target.ocrText ? [{
      label: t('viewText'), icon: 'document-text' as const, tint: '#8B5CF6',
      onPress: () => navigation.navigate('Text', { text: target.ocrText!, title: target.name, docId: target.id }),
    }] : []),
    { label: t('rename'), icon: 'pencil', tint: '#F59E0B', onPress: () => setRenaming(target) },
    { label: t('delete'), icon: 'trash', destructive: true, onPress: () => confirmDelete(target) },
  ] : [];

  const element = (
    <>
      <ActionSheet visible={sheetOpen} title={target?.name} actions={actions} onClose={() => setSheetOpen(false)} />
      <PromptModal
        visible={!!renaming}
        title={t('renameDocument')}
        initialValue={renaming?.name ?? ''}
        onClose={() => setRenaming(null)}
        onSubmit={async (name) => { if (renaming) { await updateDocument(renaming.id, { name }); toast(t('renamed')); } }}
      />
    </>
  );

  return { showOptions, element };
}
