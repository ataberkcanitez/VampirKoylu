import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../src/config/firebase';
import { Colors } from '../src/constants/Colors';
import i18n from '../src/constants/i18n';

export default function JoinGameScreen() {
    const router = useRouter();
    const t = i18n.tr.join;

    const [gameId, setGameId] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoinGame = async () => {
        if (!auth.currentUser) return;
        if (!gameId || !displayName) {
            setError(i18n.tr.errors.nameRequired);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const upperGameId = gameId.toUpperCase();
            const gameRef = doc(db, 'games', upperGameId);
            const gameSnap = await getDoc(gameRef);

            if (!gameSnap.exists()) {
                setError(i18n.tr.errors.gameNotFound);
                setLoading(false);
                return;
            }

            const gameInfo = gameSnap.data();
            const playerRef = doc(db, 'games', upperGameId, 'players', auth.currentUser.uid);
            const playerSnap = await getDoc(playerRef);

            // Only create player document if they aren't already in the game
            if (!playerSnap.exists()) {
                await setDoc(playerRef, {
                    id: auth.currentUser.uid,
                    name: displayName,
                    role: null,
                    isAlive: true,
                    joinedAt: serverTimestamp(),
                });
            }

            // Redirect based on game status
            const isStarted = gameInfo?.status && gameInfo.status !== 'waiting' && gameInfo.status !== 'countdown';
            // Note: Lobby handles its own countdown redirection too, but we handle it here for direct re-entry
            if (isStarted || gameInfo?.status === 'countdown') {
                router.replace(`/game/${upperGameId}`);
            } else {
                router.replace(`/lobby/${upperGameId}`);
            }
        } catch (err) {
            console.error("Join failed", err);
            setError('Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{i18n.tr.home.joinGame}</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.inputSection}>
                        <Text style={styles.label}>{t.gameId}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="E.g. XJ2K9L"
                            placeholderTextColor="#666"
                            autoCapitalize="characters"
                            value={gameId}
                            onChangeText={setGameId}
                            maxLength={6}
                        />
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>{t.displayName}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Adınız"
                            placeholderTextColor="#666"
                            value={displayName}
                            onChangeText={setDisplayName}
                            maxLength={15}
                        />
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.joinButton, loading && { opacity: 0.7 }]}
                        onPress={handleJoinGame}
                        disabled={loading}
                    >
                        <Text style={styles.joinButtonText}>{loading ? '...' : t.join}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginLeft: 16,
    },
    content: {
        padding: 24,
        flex: 1,
        justifyContent: 'center',
    },
    inputSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.surface,
        height: 56,
        borderRadius: 12,
        color: Colors.text,
        paddingHorizontal: 16,
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#333',
    },
    errorText: {
        color: Colors.error,
        marginBottom: 16,
        textAlign: 'center',
    },
    joinButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    joinButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
});
