import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, minTapTarget, motion, radii, shadows, spacing, type } from '../lib/theme';

/** Respects the OS "reduce motion" setting — gate decorative animations on it. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export function ScreenContainer({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <SafeAreaView style={[styles.screen, style]}>{children}</SafeAreaView>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={type.title}>
      {children}
    </Text>
  );
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={type.section}>
      {children}
    </Text>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[type.body, muted && styles.bodyMuted]}>{children}</Text>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const blocked = disabled === true || loading === true;

  function pressTo(value: number) {
    if (reducedMotion) return; // pressed opacity still gives feedback
    Animated.timing(scale, {
      toValue: value,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading === true }}
      disabled={blocked}
      onPress={onPress}
      onPressIn={() => pressTo(0.97)}
      onPressOut={() => pressTo(1)}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            variant === 'secondary' && styles.buttonSecondary,
            variant === 'ghost' && styles.buttonGhost,
            disabled && styles.buttonDisabled,
            pressed && styles.buttonPressed,
            { transform: [{ scale }] },
          ]}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={variant === 'primary' ? colors.onAccent : colors.accent}
            />
          ) : (
            <Text
              style={[
                styles.buttonLabel,
                (variant === 'secondary' || variant === 'ghost') && styles.buttonLabelSecondary,
              ]}
            >
              {label}
            </Text>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

interface TextFieldProps extends TextInputProps {
  label: string;
  /** Inline error shown below the field (per §8: error near field). */
  error?: string;
  /** Persistent helper text below the field when there is no error. */
  hint?: string;
  /** Static prefix rendered inside the field, e.g. "+1" or "@". */
  prefix?: string;
  /** Trailing element inside the field, e.g. a show/hide password toggle. */
  suffix?: ReactNode;
  /** Hide the label visually (still used for accessibility). */
  labelHidden?: boolean;
}

export function TextField(props: TextFieldProps) {
  const { label, error, hint, prefix, suffix, labelHidden, style, onFocus, onBlur, ...inputProps } =
    props;
  const [focused, setFocused] = useState(false);
  const showError = Boolean(error);

  return (
    <View style={styles.fieldWrap}>
      {labelHidden ? null : <Text style={styles.fieldLabel}>{label}</Text>}
      <View
        style={[
          styles.inputShell,
          focused && styles.inputShellFocused,
          showError && styles.inputShellError,
        ]}
      >
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {suffix}
      </View>
      {showError ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Thin animated progress bar for multi-step flows (0..1). */
export function ProgressBar({ progress }: { progress: number }) {
  const anim = useRef(new Animated.Value(progress)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: reducedMotion ? 0 : motion.slow,
      useNativeDriver: false, // width animation
    }).start();
  }, [anim, progress, reducedMotion]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={styles.progressTrack}
    >
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.centered} accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[type.body, styles.bodyMuted, styles.stateText]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.centered}>
      <Text style={type.section}>{title}</Text>
      {detail ? <Text style={[type.body, styles.bodyMuted, styles.stateText]}>{detail}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={type.section}>Something went wrong</Text>
      <Text style={[type.body, styles.bodyMuted, styles.stateText]}>
        {message ?? 'Please try again.'}
      </Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stateText: { textAlign: 'center', marginBottom: spacing.sm },
  bodyMuted: { color: colors.textMuted },
  button: {
    minHeight: minTapTarget + 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.9 },
  buttonLabel: { fontFamily: fonts.bodyExtraBold, color: colors.onAccent, fontSize: 17 },
  buttonLabelSecondary: { color: colors.text },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { ...type.label, color: colors.text },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTapTarget + 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  inputShellFocused: { borderColor: colors.accent },
  inputShellError: { borderColor: colors.disliked },
  inputPrefix: { ...type.bodyStrong, color: colors.textMuted },
  input: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  fieldError: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.disliked },
  fieldHint: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
});
