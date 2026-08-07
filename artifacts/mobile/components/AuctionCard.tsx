import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Auction } from '@workspace/api-client-react';

interface AuctionCardProps {
  auction: Auction;
  onPress: () => void;
}

function useCountdown(endAt: Date | string | null | undefined) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!endAt) { setRemaining(''); return; }

    const tick = () => {
      const diff = (endAt instanceof Date ? endAt : new Date(endAt)).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setRemaining(`${h}h ${m}m`);
      else if (m > 0) setRemaining(`${m}m ${s}s`);
      else setRemaining(`${s}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  return remaining;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'LIVE', color: '#16a34a', bg: '#dcfce7' },
  CLOSED: { label: 'CLOSED', color: '#6b7280', bg: '#f3f4f6' },
  SETTLED: { label: 'SETTLED', color: '#1d4ed8', bg: '#dbeafe' },
  CANCELLED: { label: 'CANCELLED', color: '#dc2626', bg: '#fee2e2' },
};

const COMMODITY_ICONS: Record<string, string> = {
  MAIZE: 'sun',
  RICE: 'feather',
  COFFEE: 'coffee',
  TEA: 'droplet',
  AVOCADO: 'heart',
};

export function AuctionCard({ auction, onPress }: AuctionCardProps) {
  const colors = useColors();
  const countdown = useCountdown(auction.status === 'OPEN' ? auction.endAt : null);
  const cfg = STATUS_CONFIG[auction.status ?? 'CLOSED'] ?? STATUS_CONFIG.CLOSED;
  const commodityType = (auction as any).commodityType ?? 'COMMODITY';
  const iconName = (COMMODITY_ICONS[commodityType] ?? 'package') as any;

  const currentBid = auction.currentHighBidUsd != null
    ? `$${auction.currentHighBidUsd.toLocaleString()}`
    : `$${auction.reservePriceUsd.toLocaleString()} (start)`;

  const weight = (auction as any).weightMt
    ? `${parseFloat((auction as any).weightMt).toFixed(1)} MT`
    : '—';

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
        <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={[s.bidLabel, { color: colors.mutedForeground }]}>Current Bid</Text>
      <Text style={[s.bid, { color: colors.foreground }]}>{currentBid}</Text>

      <View style={s.footer}>
        <View style={s.footerItem}>
          <Feather name="package" size={11} color={colors.mutedForeground} />
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>{weight}</Text>
        </View>
        {countdown ? (
          <View style={[s.footerItem, s.timer]}>
            <Feather name="clock" size={11} color={auction.status === 'OPEN' ? '#16a34a' : colors.mutedForeground} />
            <Text style={[s.footerText, { color: auction.status === 'OPEN' ? '#16a34a' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              {countdown}
            </Text>
          </View>
        ) : null}
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
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  bidLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  bid: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
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
  timer: {
    justifyContent: 'flex-end',
    flex: 0,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
