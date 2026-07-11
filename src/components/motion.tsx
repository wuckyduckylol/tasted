import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, motion } from '../lib/theme';
import { useReducedMotion } from './ui';

/**
 * Motion kit for the "candy thread v2" handoff. Built on core RN Animated to
 * match the codebase's existing pattern (Button/ProgressBar/Marquee) and to
 * behave identically on web. Every entrance and ambient loop is gated on the
 * OS reduce-motion setting.
 */

// cubic-bezier(.16,.8,.3,1) — entrance ease
const EASE_ENTER = Easing.bezier(0.16, 0.8, 0.3, 1);
// cubic-bezier(.2,.7,.3,1) — ring/progress ease
const EASE_DRAW = Easing.bezier(0.2, 0.7, 0.3, 1);

/** Fade + rise entrance (translateY 14→0, 550ms). `pop` adds the overshoot-scale variant. */
export function Entrance({
  children,
  delay = 0,
  pop = false,
  style,
}: PropsWithChildren<{ delay?: number; pop?: boolean; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.enter,
      delay,
      easing: pop ? Easing.bezier(0.2, 1.2, 0.36, 1) : EASE_ENTER,
      useNativeDriver: true,
    }).start();
  }, [progress, delay, pop, reduced]);

  const transform = pop
    ? [
        {
          scale: progress.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0.86, 1.045, 1],
          }),
        },
      ]
    : [
        {
          translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
        },
      ];

  return <Animated.View style={[style, { opacity: progress, transform }]}>{children}</Animated.View>;
}

/** 0 → value count-up (1300ms ease-out-cubic, 300ms start delay). */
export function CountUpText({
  value,
  decimals = 0,
  style,
  suffix = '',
  delay = 300,
  accessibilityLabel,
}: {
  value: number;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
  delay?: number;
  accessibilityLabel?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start - delay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / motion.count);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, reduced]);

  return (
    <Text style={style} accessibilityLabel={accessibilityLabel ?? `${value.toFixed(decimals)}${suffix}`}>
      {shown.toFixed(decimals)}
      {suffix}
    </Text>
  );
}

interface ScoreRingProps {
  size: number;
  strokeWidth: number;
  /** 0..1 fill fraction (e.g. score / 10). */
  fraction: number;
  color: string;
  trackColor?: string;
  /** Dashed track + no fill (unrated state). */
  dashedEmpty?: boolean;
  delay?: number;
  children?: React.ReactNode;
}

/** SVG progress ring that draws in (1350ms). Children render centered inside. */
export function ScoreRing({
  size,
  strokeWidth,
  fraction,
  color,
  trackColor = colors.track,
  dashedEmpty = false,
  delay = 250,
  children,
}: ScoreRingProps) {
  const reduced = useReducedMotion();
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, fraction));
  const [drawn, setDrawn] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || dashedEmpty) {
      setDrawn(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start - delay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / motion.ring);
      // approximate cubic-bezier(.2,.7,.3,1) with ease-out cubic drawing
      const eased = 1 - Math.pow(1 - p, 3);
      setDrawn(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay, reduced, dashedEmpty]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={dashedEmpty ? '3 7' : undefined}
        />
        {!dashedEmpty ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - drawn)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/** Ambient loop kinds (handoff motion §D). Static when reduce-motion is on. */
type AmbientKind = 'drift' | 'breathe' | 'flicker';

const AMBIENT: Record<AmbientKind, { duration: number }> = {
  drift: { duration: 7000 },
  breathe: { duration: 5500 },
  flicker: { duration: 2600 },
};

export function Ambient({
  kind,
  children,
  delay = 0,
  style,
}: PropsWithChildren<{ kind: AmbientKind; delay?: number; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: AMBIENT[kind].duration,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: AMBIENT[kind].duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, kind, delay, reduced]);

  const transform =
    kind === 'drift'
      ? [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 9] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '16deg'] }) },
        ]
      : kind === 'breathe'
        ? [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }]
        : [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '4deg'] }) },
          ];

  return <Animated.View style={[style, { transform }]}>{children}</Animated.View>;
}

/** Progress fill that draws in from the left (700ms). fraction 0..1. */
export function DrawBar({
  fraction,
  color,
  height = 7,
  trackColor = colors.track,
  delay = 0,
}: {
  fraction: number;
  color: string;
  height?: number;
  trackColor?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, {
      toValue: 1,
      duration: 700,
      delay,
      easing: EASE_DRAW,
      useNativeDriver: false, // width %
    }).start();
  }, [v, delay, reduced]);

  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: trackColor, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: color,
          width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }),
        }}
      />
    </View>
  );
}
