import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/Colors';
import i18n from '../src/constants/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const t = i18n.tr.home;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Vampir Köylü</Text>
        <Text style={styles.subtitle}>Gerçek zamanlı oyun ortağı</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/create')}
          >
            <Text style={styles.buttonText}>{t.createGame}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.secondary }]}
            onPress={() => router.push('/join')}
          >
            <Text style={styles.buttonText}>{t.joinGame}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 64,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
});
