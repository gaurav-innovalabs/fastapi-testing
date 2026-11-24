import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SceneScreen } from './src/ui/SceneScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SceneScreen />
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4ECDC' },
});
