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
import { AuctionCard } from '@/components/AuctionCard';
import { SkeletonAuctionCard } from '@/components/Skeleton';
import { useListAuctions } from '@workspace/api-client-react';
import type { Auction } from '@workspace/api-client-react';

type StatusFilter = 'ALL' | 'OPEN' | 'CLOSED' | 'SETTLED';

const STATUS_TABS: StatusFilter[] = ['ALL', 'OPEN', 'CLOSED', 'SETTLED'];
const IS_WEB = Platform.OS === 'web';

export default function AuctionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const [refreshing, setRefreshing] = useState(false);

  const params = status === 'ALL' ? undefined : { status };
  const { data: auctions, isLoading, refetch, isError } = useListAuctions(params);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: IS_WEB ? 67 : insets.top,
      paddingHorizontal: 20,
      paddingBottom: 0,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      paddingBottom: 12,
    },
    tabRow: {
      flexDirection: 'row' as const,
      gap: 0,
      paddingBottom: 0,
    },
    tab: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: IS_WEB ? 34 : insets.bottom + 80,
    },
    empty: {
      alignItems: 'center' as const,
      paddingVertical: 64,
      gap: 8,
    },
    emptyIcon: {
      marginBottom: 4,
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
      fontFamily: 'Inter_400Regular',
      color: colors.destructive,
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

  const renderItem = ({ item }: { item: Auction }) => (
    <AuctionCard
      auction={item}
      onPress={() => router.push(`/auction/${item.id}`)}
    />
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <>
          {[1, 2, 3].map((i) => <SkeletonAuctionCard key={i} style={{ marginHorizontal: 0 }} />)}
        </>
      );
    }
    if (isError) {
      return (
        <View style={s.empty}>
          <Feather name="alert-circle" size={32} color={colors.destructive} style={s.emptyIcon} />
          <Text style={s.errorText}>Failed to load auctions</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.empty}>
        <Feather name="activity" size={32} color={colors.border} style={s.emptyIcon} />
        <Text style={s.emptyTitle}>No auctions</Text>
        <Text style={s.emptyText}>
          {status === 'OPEN' ? 'No live auctions right now.' : 'No auctions found.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Auctions</Text>
        <View style={s.tabRow}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                s.tab,
                { borderBottomColor: status === tab ? colors.primary : 'transparent' },
              ]}
              onPress={() => setStatus(tab)}
            >
              <Text
                style={[
                  s.tabText,
                  { color: status === tab ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={isLoading || isError ? [] : (auctions ?? [])}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={!!(auctions?.length)}
      />
    </View>
  );
}
