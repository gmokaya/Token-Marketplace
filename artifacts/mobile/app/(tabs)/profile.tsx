import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetMe } from '@workspace/api-client-react';

const IS_WEB = Platform.OS === 'web';

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  PRODUCER: { label: 'Producer', color: '#16a34a' },
  OFF_TAKER: { label: 'Off-Taker', color: '#1d4ed8' },
  COOPERATIVE: { label: 'Cooperative', color: '#7c3aed' },
  FINANCIER: { label: 'Financier', color: '#d97706' },
  ENABLER: { label: 'Enabler', color: '#0891b2' },
  ADMIN: { label: 'Admin', color: '#dc2626' },
};

const KYB_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'KYB Pending', color: '#d97706' },
  APPROVED: { label: 'KYB Approved', color: '#16a34a' },
  REJECTED: { label: 'KYB Rejected', color: '#dc2626' },
};

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const colors = useColors();
  return (
    <View style={[ir.row, { borderBottomColor: colors.border }]}>
      <Feather name={icon as any} size={16} color={colors.mutedForeground} style={ir.icon} />
      <View style={ir.body}>
        <Text style={[ir.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[ir.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const { data: apiUser } = useGetMe();

  const tier = apiUser?.tier ?? '';
  const kyb = apiUser?.kybStatus ?? '';
  const tierCfg = TIER_CONFIG[tier];
  const kybCfg = KYB_CONFIG[kyb];

  const displayName = clerkUser?.fullName ?? clerkUser?.primaryEmailAddress?.emailAddress ?? 'User';
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: IS_WEB ? 67 : insets.top + 16,
      paddingBottom: IS_WEB ? 34 : insets.bottom + 80,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 24,
    },
    avatarRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 16,
      marginBottom: 24,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    avatarText: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.primaryForeground,
    },
    avatarInfo: {
      flex: 1,
    },
    name: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    emailText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: 'row' as const,
      gap: 8,
      marginTop: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
    },
    section: {
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden' as const,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      marginBottom: 8,
    },
    signOutBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingVertical: 16,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.destructive + '40',
      backgroundColor: colors.destructive + '0a',
      marginTop: 8,
    },
    signOutText: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: colors.destructive,
    },
  });

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>Profile</Text>

        <View style={s.avatarRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.avatarInfo}>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.emailText}>{email}</Text>
            <View style={s.badgeRow}>
              {tierCfg && (
                <View style={[s.badge, { backgroundColor: tierCfg.color + '18' }]}>
                  <Text style={[s.badgeText, { color: tierCfg.color }]}>{tierCfg.label}</Text>
                </View>
              )}
              {kybCfg && (
                <View style={[s.badge, { backgroundColor: kybCfg.color + '18' }]}>
                  <Text style={[s.badgeText, { color: kybCfg.color }]}>{kybCfg.label}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Account Details</Text>
        <View style={s.section}>
          <InfoRow icon="user" label="Full name" value={displayName} />
          <InfoRow icon="mail" label="Email" value={email} />
          {apiUser?.tier && <InfoRow icon="award" label="Account tier" value={apiUser.tier} />}
          {apiUser?.id && <InfoRow icon="hash" label="User ID" value={String(apiUser.id)} />}
        </View>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ir = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: 12,
    width: 20,
  },
  body: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
