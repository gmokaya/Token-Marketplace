import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilterBar, type CommodityFilter } from '@/components/FilterBar';
import { ListingCard } from '@/components/ListingCard';
import { SkeletonListingCard } from '@/components/Skeleton';
import { useListSpotListings, useGetMarketSummary } from '@workspace/api-client-react';
import type { SpotListing } from '@workspace/api-client-react';

const IS_WEB = Platform.OS === 'web';

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [commodity, setCommodity] = useState<CommodityFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const listParams =
    commodity === 'ALL'
      ? { status: 'ACTIVE' as const }
      : { status: 'ACTIVE' as const, commodityType: commodity };

  const {
    data: listings,
    isLoading,
    isError,
    refetch,
  } = useListSpotListings(listParams);

  const { data: summary } = useGetMarketSummary();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: IS_WEB ? 67 : insets.top,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTop: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row' as const,
      gap: 10,
    },
    statChip: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 10,
    },
    statValue: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginTop: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: IS_WEB ? 34 : insets.bottom + 80,
    },
    empty: {
      alignItems: 'center' as const,
      paddingVertical: 64,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 14,
      color: colors.destructive,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: colors.radius,
      backgroundColor: colors.muted,
    },
    retryText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
  });

  const renderItem = ({ item }: { item: SpotListing }) => (
    <ListingCard
      listing={item as any}
      onPress={() => router.push(`/listing/${item.id}`)}
    />
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <>
          {[1, 2, 3, 4].map((i) => <SkeletonListingCard key={i} />)}
        </>
      );
    }
    if (isError) {
      return (
        <View style={s.empty}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={s.errorText}>Failed to load listings</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.empty}>
        <Feather name="package" size={32} color={colors.border} />
        <Text style={s.emptyTitle}>No listings</Text>
        <Text style={s.emptyText}>
          {commodity === 'ALL'
            ? 'No active listings at the moment.'
            : `No active ${commodity.toLowerCase()} listings.`}
        </Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Market</Text>
          {summary && (
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Text style={s.statValue}>{summary.totalActiveListings ?? '—'}</Text>
                <Text style={s.statLabel}>Active Listings</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statValue}>{summary.totalEwrs ?? '—'}</Text>
                <Text style={s.statLabel}>Total eWRs</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statValue}>
                  {summary.avgPricePerMt
                    ? `$${parseFloat(String(summary.avgPricePerMt)).toFixed(0)}`
                    : '—'}
                </Text>
                <Text style={s.statLabel}>Avg Price/MT</Text>
              </View>
            </View>
          )}
        </View>
        <FilterBar value={commodity} onChange={setCommodity} />
      </View>

      <FlatList
        data={isLoading || isError ? [] : (listings ?? [])}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={!!(listings?.length)}
      />
    </View>
  );
}
