import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import {
  useListEwrs,
  useListOrders,
} from '@workspace/api-client-react';
import type { Ewr, Order } from '@workspace/api-client-react';

const IS_WEB = Platform.OS === 'web';

const EWR_STATE_COLORS: Record<string, string> = {
  INGESTED: '#2d7d46',
  MARKET_LISTED: '#1d4ed8',
  AUCTION_ACTIVE: '#d97706',
  FORWARD_BOUND: '#7c3aed',
  LOCK_TRADING: '#6b7280',
  SETTLED: '#047857',
  ENCUMBERED: '#b45309',
  EXTINGUISHED: '#6b7280',
};

function EwrRow({ ewr }: { ewr: Ewr }) {
  const colors = useColors();
  const stateColor = EWR_STATE_COLORS[ewr.state] ?? colors.mutedForeground;

  return (
    <View style={[ews.row, { borderBottomColor: colors.border }]}>
      <View style={ews.rowLeft}>
        <Text style={[ews.commodity, { color: colors.foreground }]}>
          {ewr.commodityType} · Grade {ewr.grade ?? '—'}
        </Text>
        <Text style={[ews.weight, { color: colors.mutedForeground }]}>
          {ewr.weightMt != null ? `${ewr.weightMt.toFixed(1)} MT` : '—'} · {ewr.warehouseCode ?? '—'}
        </Text>
      </View>
      <View style={[ews.statePill, { backgroundColor: stateColor + '18' }]}>
        <Text style={[ews.stateText, { color: stateColor }]}>
          {ewr.state.replace(/_/g, ' ')}
        </Text>
      </View>
    </View>
  );
}

function OrderRow({ order }: { order: Order }) {
  const colors = useColors();
  const isSettled = order.status === 'SETTLED';

  return (
    <View style={[ews.row, { borderBottomColor: colors.border }]}>
      <View style={ews.rowLeft}>
        <Text style={[ews.commodity, { color: colors.foreground }]}>
          Order #{order.id}
        </Text>
        <Text style={[ews.weight, { color: colors.mutedForeground }]}>
          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
        </Text>
      </View>
      <View style={[ews.statePill, { backgroundColor: isSettled ? '#dcfce7' : '#fef3c7' }]}>
        <Text style={[ews.stateText, { color: isSettled ? '#16a34a' : '#b45309' }]}>
          {order.status}
        </Text>
      </View>
    </View>
  );
}

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'ewrs' | 'orders'>('ewrs');

  const { data: ewrs, isLoading: ewrsLoading, refetch: refetchEwrs } = useListEwrs();
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useListOrders();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEwrs(), refetchOrders()]);
    setRefreshing(false);
  }, [refetchEwrs, refetchOrders]);

  const totalWeight = ewrs && ewrs.length > 0
    ? `${ewrs.reduce((sum, e) => sum + (e.weightMt ?? 0), 0).toFixed(1)} MT`
    : '0 MT';

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: IS_WEB ? 67 : insets.top,
      paddingBottom: 0,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTop: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row' as const,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginTop: 2,
    },
    tabRow: {
      flexDirection: 'row' as const,
      paddingHorizontal: 20,
    },
    tabBtn: {
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
    content: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: IS_WEB ? 34 : insets.bottom + 80,
    },
    empty: {
      alignItems: 'center' as const,
      paddingVertical: 48,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    skeletonWrap: {
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 8,
    },
  });

  const isLoading = tab === 'ewrs' ? ewrsLoading : ordersLoading;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Portfolio</Text>
          <View style={s.statsRow}>
            <View style={s.statCard}>
              {!ewrsLoading ? (
                <>
                  <Text style={s.statValue}>{ewrs?.length ?? 0}</Text>
                  <Text style={s.statLabel}>Receipts</Text>
                </>
              ) : (
                <Skeleton height={22} width={48} />
              )}
            </View>
            <View style={s.statCard}>
              {!ewrsLoading ? (
                <>
                  <Text style={s.statValue}>{totalWeight}</Text>
                  <Text style={s.statLabel}>Total Weight</Text>
                </>
              ) : (
                <Skeleton height={22} width={72} />
              )}
            </View>
            <View style={s.statCard}>
              {!ordersLoading ? (
                <>
                  <Text style={s.statValue}>{orders?.length ?? 0}</Text>
                  <Text style={s.statLabel}>Orders</Text>
                </>
              ) : (
                <Skeleton height={22} width={32} />
              )}
            </View>
          </View>
        </View>

        <View style={s.tabRow}>
          {(['ewrs', 'orders'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, { borderBottomColor: tab === t ? colors.primary : 'transparent' }]}
              onPress={() => setTab(t)}
            >
              <Text
                style={[
                  s.tabText,
                  { color: tab === t ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t === 'ewrs' ? 'Receipts' : 'Orders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={s.skeletonWrap}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={60} borderRadius={8} />
          ))}
        </View>
      ) : tab === 'ewrs' ? (
        <FlatList
          data={ewrs ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EwrRow ewr={item} />}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="inbox" size={28} color={colors.border} />
              <Text style={s.emptyTitle}>No receipts</Text>
              <Text style={s.emptyText}>Your eWRs will appear here</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          scrollEnabled={!!(ewrs?.length)}
        />
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderRow order={item} />}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="file-text" size={28} color={colors.border} />
              <Text style={s.emptyTitle}>No orders</Text>
              <Text style={s.emptyText}>Your trade orders will appear here</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          scrollEnabled={!!(orders?.length)}
        />
      )}
    </View>
  );
}

const ews = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  commodity: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  weight: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 12,
  },
  stateText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});
