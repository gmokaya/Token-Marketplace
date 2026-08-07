import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { SpotListing } from '@workspace/api-client-react';

interface ListingCardProps {
  listing: SpotListing & {
    commodityType?: string | null;
    grade?: string | null;
    weightMt?: number | null;
    warehouseCode?: string | null;
    sellerName?: string | null;
    totalValueUsd?: number | null;
  };
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#2d7d46',
  LOCKED: '#b45309',
  SETTLED: '#1d4ed8',
  CANCELLED: '#6b7280',
};

const COMMODITY_ICONS: Record<string, string> = {
  MAIZE: 'sun',
  RICE: 'feather',
  COFFEE: 'coffee',
  TEA: 'droplet',
  AVOCADO: 'heart',
};

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const colors = useColors();
  const commodityType = listing.commodityType ?? 'COMMODITY';
  const statusColor = STATUS_COLORS[listing.status ?? 'ACTIVE'] ?? colors.mutedForeground;
  const iconName = (COMMODITY_ICONS[commodityType] ?? 'package') as any;

  const price = listing.pricePerMt ? `$${listing.pricePerMt.toLocaleString()}/MT` : '—';
  const weight = listing.weightMt != null ? `${listing.weightMt.toFixed(1)} MT` : '—';
  const grade = listing.grade ?? '—';
  const warehouse = listing.warehouseCode ? listing.warehouseCode.slice(0, 6) : '—';

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={s.header}>
        <View style={[s.badge, { backgroundColor: colors.muted }]}>
          <Feather name={iconName} size={12} color={colors.mutedForeground} />
          <Text style={[s.badgeText, { color: colors.mutedForeground }]}>{commodityType}</Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: statusColor + '20' }]}>
          <View style={[s.dot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusText, { color: statusColor }]}>{listing.status ?? 'ACTIVE'}</Text>
        </View>
      </View>

      <Text style={[s.price, { color: colors.foreground }]}>{price}</Text>
      <Text style={[s.grade, { color: colors.mutedForeground }]}>Grade {grade} · {weight}</Text>

      <View style={s.footer}>
        <View style={s.footerItem}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>{warehouse}</Text>
        </View>
        {listing.sellerName && (
          <View style={s.footerItem}>
            <Feather name="user" size={11} color={colors.mutedForeground} />
            <Text style={[s.footerText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {listing.sellerName}
            </Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  price: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  grade: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
