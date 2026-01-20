import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, writeBatch } from 'firebase/firestore';
import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { Colors } from '../../src/constants/Colors';
import i18n from '../../src/constants/i18n';
import { useGame } from '../../src/hooks/useGame';
import { usePlayers } from '../../src/hooks/usePlayers';
import { shuffleArray } from '../../src/utils/gameHelpers';

export default function LobbyScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { game, loading: gameLoading } = useGame(id);
    const { players, loading: playersLoading } = usePlayers(id);
    const t = i18n.tr.lobby;

    const isAdmin = game?.adminId === auth.currentUser?.uid;

    useEffect(() => {
        const startedStatuses = ['countdown', 'night', 'day', 'night_vampire', 'night_doctor', 'day_voting', 'ended'];
        if (game?.status && startedStatuses.includes(game.status)) {
            router.replace(`/game/${id}`);
        }
    }, [game?.status, id]);

    const handleStartGame = async () => {
        if (!game || !players.length) return;

        // Distribute roles
        const { vampires, villagers, doctor } = game.rolesConfig;
        const totalRolesNeeded = vampires + villagers + doctor;

        // In this utility app, we might have more players than roles or vice versa.
        // Ideally, totalRolesNeeded should match players.length.
        // If players.length > totalRolesNeeded, extra players are villagers.
        // If players.length < totalRolesNeeded, we might need to adjust or show error.

        const rolePool: string[] = [];
        for (let i = 0; i < vampires; i++) rolePool.push('vampire');
        for (let i = 0; i < doctor; i++) rolePool.push('doctor');
        const remaining = Math.max(0, players.length - rolePool.length);
        for (let i = 0; i < remaining; i++) rolePool.push('villager');

        const shuffledRoles = shuffleArray(rolePool);
        const batch = writeBatch(db);

        players.forEach((player, index) => {
            const playerRef = doc(db, 'games', id, 'players', player.id);
            batch.update(playerRef, { role: shuffledRoles[index] });
        });

        const gameRef = doc(db, 'games', id);
        batch.update(gameRef, {
            status: 'countdown',
            countdownEndsAt: Date.now() + 10000 // 10 seconds from now
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Failed to start game", error);
        }
    };

    if (gameLoading) return <View style={styles.container}><Text style={styles.infoText}>Loading...</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Oyun: {id}</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>{t.playerList} ({players.length})</Text>

                <FlatList
                    data={players}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.playerItem}>
                            <View style={[styles.playerIcon, { backgroundColor: item.id === game?.adminId ? Colors.accent : '#444' }]}>
                                <Ionicons name="person" size={20} color={Colors.text} />
                            </View>
                            <Text style={styles.playerName}>{item.name}</Text>
                            {item.id === auth.currentUser?.uid && <Text style={styles.selfTag}>(Siz)</Text>}
                            {item.id === game?.adminId && <Ionicons name="star" size={16} color={Colors.accent} style={{ marginLeft: 8 }} />}
                        </View>
                    )}
                    style={styles.list}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />

                {isAdmin ? (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.startButton, players.length < 3 && { opacity: 0.5 }]}
                            onPress={handleStartGame}
                            disabled={players.length < 3}
                        >
                            <Text style={styles.startButtonText}>{t.startNow}</Text>
                        </TouchableOpacity>
                        {players.length < 3 && <Text style={styles.minPlayerWarning}>En az 3 oyuncu gerekiyor.</Text>}
                    </View>
                ) : (
                    <View style={styles.footer}>
                        <Text style={styles.waitingText}>{t.waitingPlayers}</Text>
                    </View>
                )}
            </View>
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
        flex: 1,
        padding: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 20,
    },
    list: {
        flex: 1,
    },
    playerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    playerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    playerName: {
        fontSize: 18,
        color: Colors.text,
        fontWeight: '500',
    },
    selfTag: {
        marginLeft: 8,
        color: Colors.textSecondary,
        fontSize: 14,
    },
    infoText: {
        color: Colors.text,
        fontSize: 18,
        textAlign: 'center',
        marginTop: 100,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: Colors.success,
        height: 60,
        borderRadius: 30,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    startButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    minPlayerWarning: {
        color: Colors.textSecondary,
        marginTop: 12,
        fontSize: 14,
    },
    waitingText: {
        color: Colors.accent,
        fontSize: 18,
        fontWeight: '600',
        fontStyle: 'italic',
    },
});
