import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { trustColor, trustLabel } from '../lib/trustScore';

interface Props {
  score: number;
  size?: 'sm' | 'md';
}

export default function TrustBadge({ score, size = 'md' }: Props) {
  const color = trustColor(score);
  const label = trustLabel(score);
  const small = size === 'sm';

  return (
    <View style={[styles.badge, { borderColor: color }, small && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, small && styles.labelSm]}>
        {score > 0 ? `${Math.round(score)} · ${label}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
  },
});
