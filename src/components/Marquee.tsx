import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../lib/theme';
import { useReducedMotion } from './ui';

/**
 * Horizontal ticker bar (happly-style). Renders the phrase list twice and
 * loops a translateX for a seamless scroll; static when reduce-motion is on.
 */
export function Marquee({ phrases, speed = 40 }: { phrases: string[]; speed?: number }) {
  const offset = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);
  const reducedMotion = useReducedMotion();

  const line = phrases.join('   ·   ') + '   ·   ';

  useEffect(() => {
    if (reducedMotion || contentWidth === 0) return;
    offset.setValue(0);
    const loop = Animated.loop(
      Animated.timing(offset, {
        toValue: -contentWidth,
        duration: (contentWidth / speed) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [offset, contentWidth, speed, reducedMotion]);

  return (
    <View style={styles.bar} accessibilityLabel={phrases.join('. ')}>
      <Animated.View style={[styles.row, { transform: [{ translateX: offset }] }]}>
        <Text style={styles.text} onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
          {line}
        </Text>
        <Text style={styles.text}>{line}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.baseDark,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row' },
  text: {
    // flexShrink 0 keeps the intrinsic single-line width so the line never wraps.
    flexShrink: 0,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.base,
    letterSpacing: 0.5,
  },
});
