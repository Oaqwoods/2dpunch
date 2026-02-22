import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function SkeletonBlock({ width, height, style }: { width?: number | string; height: number; style?: object }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: 6, backgroundColor: '#2a2a2a', opacity: pulse },
        style,
      ]}
    />
  );
}

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <SkeletonBlock width={90} height={12} />
        <View style={styles.headerRight}>
          <SkeletonBlock width={54} height={20} style={{ borderRadius: 10 }} />
          <SkeletonBlock width={28} height={11} />
        </View>
      </View>
      {/* Body lines */}
      <SkeletonBlock height={13} />
      <SkeletonBlock height={13} width="85%" />
      <SkeletonBlock height={13} width="65%" />
      {/* Trust badge */}
      <SkeletonBlock width={80} height={22} style={{ borderRadius: 11 }} />
      {/* Footer */}
      <View style={styles.footer}>
        <SkeletonBlock width={36} height={12} />
        <SkeletonBlock width={36} height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { flexDirection: 'row', gap: 14 },
});
