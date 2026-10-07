import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, StyleSheet, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Button, EmptyState, Header, IconButton } from '../components/ui';
import { BannerSlot, NativeAdCard } from '../components/ads';
import { DocumentRow } from '../components/DocumentRow';
import { openDocument, useDocumentActions, useDocuments } from '../hooks/useDocumentActions';
import { scanPages } from '../services/capture';
import { ScanDocument } from '../services/documents';
import type { ScreenProps } from '../navigation';

type Sort = 'newest' | 'oldest' | 'name';
const SORT_LABEL: Record<Sort, string> = { newest: 'Newest', oldest: 'Oldest', name: 'Name' };
const NEXT_SORT: Record<Sort, Sort> = { newest: 'oldest', oldest: 'name', name: 'newest' };
const AD_AFTER = 3;

type Item = { type: 'doc'; doc: ScanDocument } | { type: 'ad' };

export default function DocumentsScreen({ navigation }: ScreenProps<'Documents'>) {
  const { theme } = useTheme();
  const c = theme.colors;
  const docs = useDocuments();
  const { showOptions, element } = useDocumentActions();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const list = (docs ?? []).filter((d) => !q || d.name.toLowerCase().includes(q) || d.ocrText?.toLowerCase().includes(q));
    list.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt));
    const out: Item[] = list.map((doc) => ({ type: 'doc', doc }));
    if (out.length >= AD_AFTER) out.splice(AD_AFTER, 0, { type: 'ad' });
    return out;
  }, [docs, query, sort]);

  const scan = async () => {
    const pages = await scanPages();
    if (pages.length) navigation.navigate('Editor', { pages });
  };

  const empty = docs !== null && docs.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Header
        title="Documents"
        subtitle={docs ? `${docs.length} ${docs.length === 1 ? 'file' : 'files'}` : undefined}
        onBack={() => navigation.goBack()}
        right={<IconButton icon="scan-outline" onPress={scan} accessibilityLabel="Scan new document" />}
      />

      {empty ? (
        <EmptyState
          icon="folder-open-outline"
          title="No documents yet"
          text="Scan paper documents or convert photos into clean, shareable PDFs."
          action={<Button title="Scan a document" icon="scan" onPress={scan} />}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="search" size={18} color={c.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search names and text"
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.textPrimary }]}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {!!query && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={c.textMuted} /></Pressable>
              )}
            </View>
            <Pressable
              onPress={() => setSort(NEXT_SORT[sort])}
              style={[styles.sort, { backgroundColor: c.surface, borderColor: c.border }]}
              accessibilityLabel={`Sort by ${SORT_LABEL[sort]}`}
            >
              <Ionicons name="swap-vertical" size={16} color={c.textSecondary} />
              <Text style={[styles.sortText, { color: c.textSecondary }]}>{SORT_LABEL[sort]}</Text>
            </Pressable>
          </View>

          <FlatList
            data={items}
            keyExtractor={(it) => (it.type === 'ad' ? 'ad' : it.doc.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => item.type === 'ad'
              ? <NativeAdCard />
              : <DocumentRow doc={item.doc} onPress={() => openDocument(item.doc)} onMore={() => showOptions(item.doc)} />}
            ListEmptyComponent={docs ? (
              <Text style={[styles.noMatch, { color: c.textMuted }]}>No documents match "{query}"</Text>
            ) : null}
          />
        </>
      )}
      <BannerSlot />
      {element}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 46, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  sortText: { fontSize: 13, fontWeight: '700' },
  noMatch: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
