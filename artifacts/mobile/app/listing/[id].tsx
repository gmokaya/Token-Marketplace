import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetSpotListing, useGetMe } from '@workspace/api-client-react';

const IS_WEB = Platform.OS === 'web';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = parseInt(id ?? '0', 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: listingResponse, isLoading, isError, refetch } = useGetSpotListing(listingId);
  const { data: me } = useGetMe();

  const isOffTaker = me?.tier === 'OFF_TAKER';

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
    backBtn: {
      padding: 4,
    },
    topTitle: {
      fontSize: 17,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    scroll: { flex: 1 },
    scrollContent: {
      padding: 20,
      paddingBottom: IS_WEB ? 34 : insets.bottom + 24,
      gap: 20,
    },
    badge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      alignSelf: 'flex-start' as const,
      backgroundColor: colors.muted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
    },
    priceRow: {
      gap: 4,
    },
    priceLabel: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    price: {
      fontSize: 36,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    priceUnit: {
      fontSize: 16,
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
    detailLabel: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    detailValue: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    buyBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      alignItems: 'center' as const,
    },
    buyBtnText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primaryForeground,
    },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 12 },
    errorText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.destructive },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: colors.radius,
      backgroundColor: colors.muted,
    },
    retryText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground },
  });

  if (isLoading) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Listing</Text>
        </View>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (isError || !listingResponse) {
    return (
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Listing</Text>
        </View>
        <View style={s.center}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={s.errorText}>Listing not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const listing = listingResponse?.listing;
  const ewr = listingResponse?.ewr;
  const pricePerMt = listing?.pricePerMt ?? 0;
  const weightMt = listing?.weightMt ?? ewr?.weightMt ?? 0;
  const totalValue = listing?.totalValueUsd ?? pricePerMt * weightMt;

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Listing #{listing?.id}</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.badge}>
          <Feather name="layers" size={14} color={colors.mutedForeground} />
          <Text style={s.badgeText}>{listing?.commodityType ?? ewr?.commodityType ?? 'COMMODITY'}</Text>
        </View>

        <View style={s.priceRow}>
          <Text style={s.priceLabel}>Price per MT</Text>
          <Text style={s.price}>
            ${pricePerMt.toLocaleString()}{' '}
            <Text style={s.priceUnit}>/ MT</Text>
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Receipt Details</Text>
          {[
            ['Grade', listing?.grade ?? ewr?.grade ?? '—'],
            ['Weight', weightMt ? `${weightMt.toFixed(2)} MT` : '—'],
            ['Warehouse', listing?.warehouseCode ?? ewr?.warehouseCode ?? '—'],
            ['Season', listing?.harvestSeason ?? ewr?.harvestSeason ?? '—'],
            ['Moisture', listing?.moisturePct != null ? `${listing.moisturePct}%` : '—'],
            ['Seller', listing?.sellerName ?? '—'],
            ['Status', listing?.status ?? '—'],
          ].map(([label, value]) => (
            <View key={label} style={s.detailRow}>
              <Text style={s.detailLabel}>{label}</Text>
              <Text style={s.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        {totalValue > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Transaction Estimate</Text>
            {[
              ['Total Value', `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
              ['Platform Fee (2%)', `$${(listing?.platformFeeUsd ?? totalValue * 0.02).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
              ['Escrow Fee (0.5%)', `$${(listing?.escrowFeeUsd ?? totalValue * 0.005).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
            ].map(([label, value]) => (
              <View key={label} style={s.detailRow}>
                <Text style={s.detailLabel}>{label}</Text>
                <Text style={s.detailValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {isOffTaker && listing?.status === 'ACTIVE' && (
          <TouchableOpacity
            style={s.buyBtn}
            activeOpacity={0.85}
            onPress={() => Alert.alert('Buy order', 'Order placement coming soon.')}
          >
            <Text style={s.buyBtnText}>Buy Now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
