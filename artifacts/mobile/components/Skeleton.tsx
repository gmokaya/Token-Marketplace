import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: borderRadius ?? 4,
          backgroundColor: colors.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonListingCard({ style }: SkeletonCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={72} height={24} borderRadius={4} />
        <Skeleton width={48} height={16} borderRadius={4} />
      </View>
      <Skeleton width="60%" height={22} style={{ marginTop: 8 }} />
      <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
      <View style={styles.cardFooter}>
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
      </View>
    </View>
  );
}

export function SkeletonAuctionCard({ style }: SkeletonCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={72} height={24} borderRadius={4} />
        <Skeleton width={56} height={20} borderRadius={10} />
      </View>
      <Skeleton width="50%" height={22} style={{ marginTop: 8 }} />
      <View style={styles.cardFooter}>
        <Skeleton width={100} height={14} />
        <Skeleton width={64} height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
