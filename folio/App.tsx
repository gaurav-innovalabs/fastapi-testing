import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Phase 0 placeholder: shows that Skia, gesture-handler and the web CanvasKit
// load path all work. Later phases replace the body with the pop-up book.
export default function App() {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 48, 420);
  const h = w * 0.66;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Folio</Text>
        <Canvas style={{ width: w, height: h }} testID="folio-canvas">
          <RoundedRect x={4} y={4} width={w - 8} height={h - 8} r={10}>
            <LinearGradient start={vec(0, 0)} end={vec(w, h)} colors={['#F7EEDC', '#E2C9A0']} />
          </RoundedRect>
        </Canvas>
        <Text style={styles.caption}>a pop-up storybook · scaffold ready</Text>
        <StatusBar style="dark" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F3EBDD',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: { fontSize: 34, fontWeight: '700', color: '#2B2420', letterSpacing: 1 },
  caption: { fontSize: 14, color: '#6B5D50' },
});
