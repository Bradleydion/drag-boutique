// components/SplashScreen.tsx
// Animated logo loading screen using React Native's built-in Animated API.
// Runs on the JS thread — perfectly fine for a one-shot splash.
//
// Sequence:
//   0ms    → Navy overlay visible
//   100ms  → Logo fades in + scales up
//   500ms  → "✦ SEQUINS ✦" fades in
//   900ms  → Tagline fades in
//   1800ms → Overlay fades out, onFinish() fires

import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image } from 'react-native';
import { colors } from '../src/theme/colors';

const LOGO_SIZE = Dimensions.get('window').width * 0.35;

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const overlayOpacity  = useRef(new Animated.Value(1)).current;
  const logoOpacity     = useRef(new Animated.Value(0)).current;
  const logoScale       = useRef(new Animated.Value(0.72)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo in at 100ms
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, friction: 7, tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Wordmark in at 500ms
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(wordmarkOpacity, {
        toValue: 1, duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline in at 900ms
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Fade out at 1800ms → call onFinish
    Animated.sequence([
      Animated.delay(1800),
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View
      style={{
        opacity: overlayOpacity,
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        backgroundColor: colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Logo */}
      <Animated.View style={{
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
        marginBottom: 24,
      }}>
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text style={{
        opacity: wordmarkOpacity,
        color: colors.teal,
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 10,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        ✦ SEQUINS ✦
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={{
        opacity: taglineOpacity,
        color: colors.textMuted,
        fontSize: 13,
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontWeight: '500',
      }}>
        for the culture
      </Animated.Text>
    </Animated.View>
  );
}
