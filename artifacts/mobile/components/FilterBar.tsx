import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export type CommodityFilter = 'ALL' | 'MAIZE' | 'RICE' | 'COFFEE' | 'TEA' | 'AVOCADO';

const COMMODITIES: CommodityFilter[] = ['ALL', 'MAIZE', 'RICE', 'COFFEE', 'TEA', 'AVOCADO'];

const COMMODITY_LABELS: Record<CommodityFilter, string> = {
  ALL: 'All',
  MAIZE: 'Maize',
  RICE: 'Rice',
  COFFEE: 'Coffee',
  TEA: 'Tea',
  AVOCADO: 'Avocado',
};

interface FilterBarProps {
  value: CommodityFilter;
  onChange: (v: CommodityFilter) => void;
}

export function FilterBar({ value, onChange }: FilterBarProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      {COMMODITIES.map((commodity) => {
        const active = value === commodity;
        return (
          <TouchableOpacity
            key={commodity}
            onPress={() => onChange(commodity)}
            activeOpacity={0.75}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {COMMODITY_LABELS[commodity]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    paddingVertical: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
