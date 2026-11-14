import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="pair" />
          <Stack.Screen name="approval" />
          <Stack.Screen name="connected" />
          <Stack.Screen name="mode-select" />
          <Stack.Screen name="modes/remote" />
          <Stack.Screen name="modes/annotation" />
          <Stack.Screen name="modes/presenter" />
          <Stack.Screen name="modes/speak-only" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="error" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
