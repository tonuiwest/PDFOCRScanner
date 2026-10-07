import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { Button, Header, IconButton, useToast } from '../components/ui';
import { updateDocument, writeTextFile } from '../services/documents';
import { leavingApp } from '../services/capture';
import { adsManager } from '../services/adsManager';
import type { ScreenProps } from '../navigation';

export default function TextScreen({ route, navigation }: ScreenProps<'Text'>) {
  const { theme } = useTheme();
  const c = theme.colors;
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { title, docId } = route.params;
  const [text, setText] = useState(route.params.text);
  const [original, setOriginal] = useState(route.params.text);
  const dirty = text !== original;

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    toast('Copied to clipboard', 'copy');
    setTimeout(() => adsManager.maybeShowInterstitial(), 900);
  };

  const shareTxt = async () => {
    try {
      const uri = await writeTextFile(title, text);
      await leavingApp(() => Sharing.shareAsync(uri, { mimeType: 'text/plain', UTI: 'public.plain-text', dialogTitle: title }));
      adsManager.maybeShowInterstitial();
    } catch (e: any) {
      Alert.alert('Could not share', e?.message);
    }
  };

  const save = async () => {
    if (!docId) return;
    await updateDocument(docId, { ocrText: text });
    setOriginal(text);
    toast('Text saved');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Header
        title={title}
        subtitle={`${words} words · ${text.length} characters`}
        onBack={() => navigation.goBack()}
        right={docId && dirty ? <IconButton icon="save-outline" onPress={save} accessibilityLabel="Save edits" color={c.primary} /> : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            style={[styles.input, { color: c.textPrimary }]}
            placeholder="No text"
            placeholderTextColor={c.textMuted}
          />
        </View>
        <Text style={[styles.hint, { color: c.textMuted }]}>Tap the text to edit before copying or sharing.</Text>
        <View style={[styles.bar, { paddingBottom: insets.bottom + 12, borderTopColor: c.border, backgroundColor: c.surface }]}>
          <Button title="Share .txt" icon="share-outline" variant="secondary" onPress={shareTxt} style={{ flex: 1 }} disabled={!text.trim()} />
          <Button title="Copy" icon="copy-outline" onPress={copy} style={{ flex: 1 }} disabled={!text.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, marginHorizontal: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 4 },
  input: { flex: 1, fontSize: 15.5, lineHeight: 23, padding: 12 },
  hint: { fontSize: 12, textAlign: 'center', marginVertical: 10 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
