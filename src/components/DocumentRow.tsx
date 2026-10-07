import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import { ScanDocument, formatBytes, formatRelative } from '../services/documents';

export function DocumentRow({ doc, onPress, onMore }: { doc: ScanDocument; onPress: () => void; onMore: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const meta = [formatRelative(doc.createdAt), doc.pages ? (doc.pages === 1 ? t('page1') : t('pagesN', { n: doc.pages })) : null, formatBytes(doc.size)]
    .filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onMore}
      style={({ pressed }) => [styles.row, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.thumb, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        {doc.thumb ? <Image source={{ uri: doc.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Ionicons name="document-text" size={24} color={c.primary} />}
        <View style={styles.pdfTag}><Text style={styles.pdfTagText}>PDF</Text></View>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>{doc.name}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: c.textMuted }]}>{meta}</Text>
        {!!doc.ocrText && (
          <View style={[styles.tag, { backgroundColor: c.successSoft }]}>
            <Ionicons name="text" size={11} color={c.success} />
            <Text style={[styles.tagText, { color: c.success }]}>{t('text')}</Text>
          </View>
        )}
      </View>
      <Pressable onPress={onMore} hitSlop={10} accessibilityLabel={t('moreOptions', { name: doc.name })} style={styles.more}>
        <Ionicons name="ellipsis-vertical" size={18} color={c.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 48, height: 62, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  pdfTag: { position: 'absolute', left: 0, bottom: 0, backgroundColor: '#E53935', paddingHorizontal: 5, paddingVertical: 2, borderTopRightRadius: 6 },
  pdfTagText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10.5, fontWeight: '700' },
  more: { padding: 6 },
});
