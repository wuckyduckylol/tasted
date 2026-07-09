import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ui';
import { PRIVACY_EFFECTIVE, PRIVACY_POLICY } from '@/features/legal/policy';
import { colors, fonts, spacing, type } from '@/lib/theme';

export default function PrivacyScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.title}>Privacy Policy</Text>
        <Text style={styles.effective}>Effective {PRIVACY_EFFECTIVE}</Text>
        {PRIVACY_POLICY.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              {section.heading}
            </Text>
            {section.body.map((para, i) => (
              <Text key={i} style={styles.para}>
                {para}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  effective: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  heading: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.text },
  para: { ...type.body, color: colors.textMuted },
});
