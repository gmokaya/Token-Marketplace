import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

const IS_WEB = Platform.OS === 'web';

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: unknown) {
      console.error('OAuth error', err);
      Alert.alert('Sign-in failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 32,
      paddingTop: IS_WEB ? 67 + 60 : insets.top + 60,
      paddingBottom: IS_WEB ? 34 + 24 : insets.bottom + 24,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      gap: 12,
    },
    iconRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    wordmark: {
      fontSize: 30,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 22,
    },
    actions: {
      gap: 14,
    },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    googleBtnText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primaryForeground,
    },
    disclaimer: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.iconRing}>
          <Feather name="layers" size={32} color={colors.primaryForeground} />
        </View>
        <Text style={s.wordmark}>TokenHarvest</Text>
        <Text style={s.tagline}>
          The digital commodity exchange{'\n'}for African agriculture
        </Text>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.googleBtn, loading && { opacity: 0.7 }]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.primaryForeground} />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          By signing in you agree to TokenHarvest's Terms of Service and Privacy
          Policy. Your trading activity is subject to platform rules.
        </Text>
      </View>
    </View>
  );
}
