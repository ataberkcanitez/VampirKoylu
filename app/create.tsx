import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../src/config/firebase';
import { Colors } from '../src/constants/Colors';
import i18n from '../src/constants/i18n';
import { generateGameId } from '../src/utils/gameHelpers';

export default function CreateGameScreen() {
    const router = useRouter();
    const t = i18n.tr.create;

    const [vampires, setVampires] = useState(1);
    const [villagers, setVillagers] = useState(4);
    const [hasDoctor, setHasDoctor] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateGame = async () => {
        if (!auth.currentUser) return;
        if (!displayName.trim()) {
            setError(i18n.tr.errors.nameRequired);
            return;
        }

        setLoading(true);
        setError('');
        const gameId = generateGameId();

        try {
            const batch = writeBatch(db);

            // 1. Create Game Document
            const gameRef = doc(db, 'games', gameId);
            batch.set(gameRef, {
                adminId: auth.currentUser.uid,
                status: 'waiting',
                rolesConfig: {
                    vampires,
                    villagers,
                    doctor: hasDoctor ? 1 : 0,
                },
                createdAt: serverTimestamp(),
                countdownEndsAt: null,
            });

            // 2. Add Admin as a Player
            const playerRef = doc(db, 'games', gameId, 'players', auth.currentUser.uid);
            batch.set(playerRef, {
                name: displayName.trim(),
                role: null,
                isAlive: true,
                joinedAt: serverTimestamp(),
            });

            await batch.commit();

            // Navigate to lobby as admin
            router.push(`/lobby/${gameId}`);
        } catch (error) {
            console.error("Game creation failed", error);
            setError('Oyun oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.startGame}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.label}>{i18n.tr.create.vampireCount}</Text>
                    <View style={styles.counter}>
                        <TouchableOpacity onPress={() => setVampires(Math.max(1, vampires - 1))} style={styles.counterButton}>
                            <Ionicons name="remove" size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{vampires}</Text>
                        <TouchableOpacity onPress={() => setVampires(vampires + 1)} style={styles.counterButton}>
                            <Ionicons name="add" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>{i18n.tr.create.villagerCount}</Text>
                    <View style={styles.counter}>
                        <TouchableOpacity onPress={() => setVillagers(Math.max(1, villagers - 1))} style={styles.counterButton}>
                            <Ionicons name="remove" size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{villagers}</Text>
                        <TouchableOpacity onPress={() => setVillagers(villagers + 1)} style={styles.counterButton}>
                            <Ionicons name="add" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sectionRow}>
                    <Text style={styles.label}>{i18n.tr.create.doctorRole}</Text>
                    <Switch
                        value={hasDoctor}
                        onValueChange={setHasDoctor}
                        trackColor={{ false: '#767577', true: Colors.success }}
                        thumbColor={hasDoctor ? Colors.text : '#f4f3f4'}
                    />
                </View>

                <View style={[styles.section, { marginBottom: 48 }]}>
                    <Text style={styles.label}>{i18n.tr.join.displayName}</Text>
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
                    style={[styles.createButton, loading && { opacity: 0.7 }]}
                    onPress={handleCreateGame}
                    disabled={loading}
                >
                    <Text style={styles.createButtonText}>{loading ? '...' : t.startGame}</Text>
                </TouchableOpacity>
            </ScrollView>
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
    },
    section: {
        marginBottom: 32,
    },
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 48,
    },
    label: {
        fontSize: 18,
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 8,
        justifyContent: 'space-between',
    },
    counterButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 8,
    },
    counterValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    createButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    createButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
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
});
