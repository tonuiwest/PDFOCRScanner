import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, TextInput, Animated,
  ViewStyle, StyleProp, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

export function Header({ title, subtitle, onBack, right }: {
  title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.header}>
      {onBack && <IconButton icon="chevron-back" onPress={onBack} accessibilityLabel="Back" />}
      <View style={{ flex: 1, marginLeft: onBack ? 4 : 0 }}>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: c.textPrimary }]}>{title}</Text>
        {!!subtitle && <Text numberOfLines={1} style={[styles.headerSub, { color: c.textMuted }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function IconButton({ icon, onPress, color, filled, accessibilityLabel, size = 22 }: {
  icon: IconName; onPress: () => void; color?: string; filled?: boolean; accessibilityLabel: string; size?: number;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        filled && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? theme.colors.textPrimary} />
    </Pressable>
  );
}

export function Button({ title, icon, onPress, variant = 'primary', disabled, loading, style }: {
  title: string; icon?: IconName; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const bg = { primary: c.primary, secondary: c.surfaceAlt, danger: c.dangerSoft, ghost: 'transparent' }[variant];
  const fg = { primary: c.onPrimary, secondary: c.textPrimary, danger: c.danger, ghost: c.primary }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.98 }] }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: React.ReactNode }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: c.textSecondary }]}>{text}</Text>
      {action && <View style={{ marginTop: 20, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}

export function LoadingOverlay({ visible, label }: { visible: boolean; label?: string }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.center, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          {!!label && <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>{label}</Text>}
        </View>
      </View>
    </Modal>
  );
}

export interface SheetAction { label: string; icon: IconName; onPress: () => void; destructive?: boolean; tint?: string }

export function ActionSheet({ visible, title, actions, onClose }: {
  visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.grabber, { backgroundColor: c.border }]} />
        {!!title && <Text numberOfLines={1} style={[styles.sheetTitle, { color: c.textMuted }]}>{title}</Text>}
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => { onClose(); setTimeout(a.onPress, 250); }}
            style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: c.surfaceAlt }]}
          >
            <View style={[styles.sheetIcon, { backgroundColor: a.destructive ? c.danger : a.tint ?? c.primary }]}>
              <Ionicons name={a.icon} size={18} color="#fff" />
            </View>
            <Text style={[styles.sheetLabel, { color: a.destructive ? c.danger : c.textPrimary }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

export function PromptModal({ visible, title, initialValue, confirmLabel = 'Save', onSubmit, onClose }: {
  visible: boolean; title: string; initialValue: string; confirmLabel?: string;
  onSubmit: (value: string) => void; onClose: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (visible) setValue(initialValue); }, [visible, initialValue]);
  const submit = () => { const v = value.trim(); if (v) { onSubmit(v); onClose(); } };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.center, { backgroundColor: c.overlay, padding: 24 }]}>
        <View style={[styles.dialog, { backgroundColor: c.surface }]}>
          <Text style={[styles.dialogTitle, { color: c.textPrimary }]}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            maxLength={80}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.textPrimary, backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button title={confirmLabel} onPress={submit} disabled={!value.trim()} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Toast ----
const ToastContext = createContext<(msg: string, icon?: IconName) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ msg: string; icon: IconName } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((msg: string, icon: IconName = 'checkmark-circle') => {
    clearTimeout(timer.current);
    setToast({ msg, icon });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, 2200);
  }, [anim]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, {
            top: insets.top + 10,
            backgroundColor: theme.isDark ? '#F1F3F9' : '#121826',
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          }]}
        >
          <Ionicons name={toast.icon} size={18} color={theme.isDark ? '#121826' : '#FFFFFF'} />
          <Text style={[styles.toastText, { color: theme.isDark ? '#121826' : '#FFFFFF' }]}>{toast.msg}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, minHeight: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', gap: 8, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { fontSize: 15, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6, maxWidth: 300 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCard: { borderRadius: 20, paddingVertical: 26, paddingHorizontal: 34, alignItems: 'center', minWidth: 180 },
  loadingText: { marginTop: 14, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingHorizontal: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 54, borderRadius: 12 },
  sheetIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetLabel: { fontSize: 16, fontWeight: '600' },
  dialog: { alignSelf: 'stretch', borderRadius: 22, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800' },
  input: { marginTop: 14, height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  toast: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, maxWidth: '90%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  toastText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
