import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar, Button } from '@/components/ui';
import { colors, fonts, minTapTarget, spacing, type } from '@/lib/theme';

import { stepProgress, type WizardStep } from './steps';

interface StepScreenProps {
  step: WizardStep;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** Renders a Skip button in the header (optional steps only). */
  onSkip?: () => void;
  /** Hide the back chevron (e.g. first step, or post-commit steps). */
  backHidden?: boolean;
  /** Extra content under the CTA, e.g. a resend link or legal note. */
  footer?: ReactNode;
}

/**
 * Shared chrome for every onboarding wizard step: back chevron, progress bar,
 * optional Skip, title block, content, and a keyboard-safe bottom CTA.
 */
export function StepScreen({
  step,
  title,
  subtitle,
  children,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  onSkip,
  backHidden,
  footer,
}: StepScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {backHidden ? (
            <View style={styles.headerSlot} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.headerSlot, styles.back, pressed && styles.pressed]}
            >
              <ChevronLeft color={colors.text} size={26} strokeWidth={2.2} />
            </Pressable>
          )}
          <View style={styles.progressWrap}>
            <ProgressBar progress={stepProgress(step)} />
          </View>
          {onSkip ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip this step"
              onPress={onSkip}
              hitSlop={8}
              style={({ pressed }) => [styles.headerSlot, pressed && styles.pressed]}
            >
              <Text style={styles.skipLabel}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSlot} />
          )}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={type.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children ? <View style={styles.body}>{children}</View> : null}
        </ScrollView>

        {ctaLabel && onCta ? (
          <View style={styles.footer}>
            <Button
              label={ctaLabel}
              onPress={onCta}
              disabled={ctaDisabled}
              loading={ctaLoading}
            />
            {footer}
          </View>
        ) : footer ? (
          <View style={styles.footer}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerSlot: {
    width: minTapTarget + 8,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { alignItems: 'flex-start' },
  progressWrap: { flex: 1 },
  skipLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
  pressed: { opacity: 0.6 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  subtitle: { ...type.body, color: colors.textMuted },
  body: { marginTop: spacing.md, gap: spacing.md },
  footer: { padding: spacing.lg, gap: spacing.md },
});
