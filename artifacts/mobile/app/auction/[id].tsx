import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  useGetAuction,
  useListAuctionBids,
  useGetMe,
  placeBid,
  getGetAuctionQueryKey,
  getListAuctionBidsQueryKey,
} from '@workspace/api-client-react';
import type { AuctionBid } from '@workspace/api-client-react';

const IS_WEB = Platform.OS === 'web';

function useCountdown(endAt: string | null | undefined, status: string | undefined) {
  const [remaining, setRemaining] = useState('');

  React.useEffect(() => {
    if (!endAt || status !== 'OPEN') { setRemaining(''); return; }
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      if (h > 0) setRemaining(`${h}h ${m}m ${sec}s`);
      else if (m > 0) setRemaining(`${m}m ${sec}s`);
      else setRemaining(`${sec}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endAt, status]);

  return remaining;
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auctionId = parseInt(id ?? '0', 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');

  const { data: auctionResponse, isLoading, isError, refetch } = useGetAuction(auctionId);
  const { data: bids, refetch: refetchBids } = useListAuctionBids(auctionId);
  const { data: me } = useGetMe();

  const auctionData = auctionResponse?.auction;
  const countdown = useCountdown(auctionData?.endAt ?? null, auctionData?.status);
  const isOffTaker = me?.tier === 'OFF_TAKER';
  const isOpen = auctionData?.status === 'OPEN';

  const currentBid = auctionData?.currentHighBidUsd != null
    ? auctionData.currentHighBidUsd
    : (auctionData?.reservePriceUsd ?? 0);

  const minBid = currentBid * 1.015; // 1.5% min increment

  const bidMutation = useMutation({
    mutationFn: (amountUsd: number) => placeBid(auctionId, { amountUsd }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBidAmount('');
      queryClient.invalidateQueries({ queryKey: getGetAuctionQueryKey(auctionId) });
      queryClient.invalidateQueries({ queryKey: getListAuctionBidsQueryKey(auctionId) });
      refetch();
      refetchBids();
      Alert.alert('Bid placed', 'Your bid has been recorded.');
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Bid failed', err?.message ?? 'Could not place bid. Please try again.');
    },
  });

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid bid', 'Please enter a valid amount.');
      return;
    }
    if (amount < minBid) {
      Alert.alert(
        'Bid too low',
        `Minimum bid is $${minBid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      );
      return;
    }
    Alert.alert(
      'Confirm bid',
      `Place a bid of $${amount.toLocaleString()} USD?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Place bid', onPress: () => bidMutation.mutate(amount) },
      ]
    );
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      paddingTop: IS_WEB ? 67 : insets.top,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: { padding: 4 },
    topTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    scroll: { flex: 1 },
    scrollContent: {
      padding: 20,
      paddingBottom: IS_WEB ? 34 : insets.bottom + 24,
      gap: 20,
    },
    liveRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    livePill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 100,
      backgroundColor: isOpen ? '#dcfce7' : colors.muted,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: isOpen ? '#16a34a' : colors.mutedForeground,
    },
    liveText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: isOpen ? '#16a34a' : colors.mutedForeground,
    },
    countdown: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: isOpen ? '#16a34a' : colors.mutedForeground,
    },
    bidSection: {
      gap: 6,
    },
    bidLabel: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    currentBid: {
      fontSize: 40,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    minBidHint: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden' as const,
    },
    cardTitle: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    detailRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    detailValue: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.foreground },
    bidInputSection: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    bidInputLabel: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    bidInputRow: {
      flexDirection: 'row' as const,
      gap: 10,
      alignItems: 'center' as const,
    },
    dollarSign: {
      fontSize: 18,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
    },
    bidInput: {
      flex: 1,
      fontSize: 20,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 6,
    },
    bidBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    bidBtnText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primaryForeground,
    },
    bidRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    bidder: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.foreground },
    bidAmt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    noBids: {
      padding: 20,
      alignItems: 'center' as const,
    },
    noBidsText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 12 },
    errorText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.destructive },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: colors.radius, backgroundColor: colors.muted },
    retryText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground },
  });

  if (isLoading) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Auction</Text>
        </View>
        <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  if (isError || !auctionResponse) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Auction</Text>
        </View>
        <View style={s.center}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={s.errorText}>Auction not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Auction #{auctionData?.id}</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.liveRow}>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>{auctionData?.status ?? 'CLOSED'}</Text>
          </View>
          {countdown ? <Text style={s.countdown}>{countdown}</Text> : null}
        </View>

        <View style={s.bidSection}>
          <Text style={s.bidLabel}>Current High Bid</Text>
          <Text style={s.currentBid}>
            ${currentBid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
          {isOpen && (
            <Text style={s.minBidHint}>
              Min next bid: ${minBid.toLocaleString(undefined, { maximumFractionDigits: 0 })} (+1.5%)
            </Text>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Details</Text>
          {[
            ['Commodity', auctionData?.commodityType ?? '—'],
            ['Weight', auctionData?.weightMt != null ? `${auctionData.weightMt.toFixed(1)} MT` : '—'],
            ['Reserve Price', auctionData?.reservePriceUsd != null ? `$${auctionData.reservePriceUsd.toLocaleString()}` : '—'],
            ['Status', auctionData?.status ?? '—'],
          ].map(([label, value]) => (
            <View key={label} style={s.detailRow}>
              <Text style={s.detailLabel}>{label}</Text>
              <Text style={s.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        {isOpen && isOffTaker && (
          <View style={s.bidInputSection}>
            <Text style={s.bidInputLabel}>Place a bid</Text>
            <View style={s.bidInputRow}>
              <Text style={s.dollarSign}>$</Text>
              <TextInput
                style={s.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="decimal-pad"
                placeholder={minBid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <TouchableOpacity
              style={[s.bidBtn, (bidMutation.isPending) && { opacity: 0.7 }]}
              onPress={handleBid}
              disabled={bidMutation.isPending}
              activeOpacity={0.85}
            >
              {bidMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={s.bidBtnText}>Place Bid</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.cardTitle}>Bid History</Text>
          {bids && bids.length > 0 ? (
            bids.slice(0, 10).map((bid: AuctionBid, idx: number) => (
              <View key={bid.id ?? idx} style={s.bidRow}>
                <Text style={s.bidder}>Bidder #{bid.bidderId ?? '—'}</Text>
                <Text style={s.bidAmt}>
                  ${(bid.amountUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              </View>
            ))
          ) : (
            <View style={s.noBids}>
              <Text style={s.noBidsText}>No bids yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
