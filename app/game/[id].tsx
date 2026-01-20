import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { Colors } from '../../src/constants/Colors';
import i18n from '../../src/constants/i18n';
import { useEvents } from '../../src/hooks/useEvents';
import { useGame } from '../../src/hooks/useGame';
import { usePlayers } from '../../src/hooks/usePlayers';

const { width, height } = Dimensions.get('window');
const GONG_URL = 'https://www.myinstants.com/media/sounds/gong.mp3';

export default function GameScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { game, loading: gameLoading } = useGame(id);
    const { players } = usePlayers(id);
    const player = useAudioPlayer(GONG_URL);

    const [countdown, setCountdown] = useState(0);
    const [showRole, setShowRole] = useState(false);
    const [adminModalVisible, setAdminModalVisible] = useState(false);

    const me = players.find(p => p.id === auth.currentUser?.uid);
    const isAdmin = game?.adminId === auth.currentUser?.uid;
    const isAlive = me?.isAlive;

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Subscriptions
    const handleEvent = useCallback(async (event: any) => {
        if (event.type === 'gong') {
            if (player) {
                player.seekTo(0);
                player.play();
            }
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            fadeAnim.setValue(0);
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
            ]).start();
        }
    }, [player, fadeAnim]);

    useEvents(id, handleEvent);

    // Countdown / Phase Timer Logic
    useEffect(() => {
        if (!game?.countdownEndsAt) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, Math.ceil((game.countdownEndsAt - now) / 1000));
            setCountdown(diff);

            if (diff === 0 && isAdmin) {
                handlePhaseEnd();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [game?.status, game?.countdownEndsAt]);

    const checkWinCondition = (currentPlayers: any[]) => {
        const aliveVampires = currentPlayers.filter(p => p.role === 'vampire' && p.isAlive).length;
        const aliveVillagers = currentPlayers.filter(p => p.role !== 'vampire' && p.isAlive).length;

        if (aliveVampires === 0) return 'villagers';
        if (aliveVampires >= aliveVillagers) return 'vampires';
        return null;
    };

    const handlePhaseEnd = async () => {
        if (!isAdmin) return;

        if (game.status === 'countdown') {
            await updateDoc(doc(db, 'games', id), { status: 'day', countdownEndsAt: null, lastDeathInfo: null });
        } else if (game.status === 'night_vampire') {
            const hasDoctor = players.some(p => p.role === 'doctor' && p.isAlive);
            if (hasDoctor) {
                await startNextPhase('night_doctor', 15);
            } else {
                await endNight();
            }
        } else if (game.status === 'night_doctor') {
            await endNight();
        } else if (game.status === 'day_voting') {
            await endDayVote();
        }
    };

    const startNextPhase = async (status: string, seconds: number) => {
        const batch = writeBatch(db);
        batch.update(doc(db, 'games', id), {
            status,
            countdownEndsAt: Date.now() + (seconds * 1000)
        });

        const eventRef = doc(collection(db, 'games', id, 'events'));
        batch.set(eventRef, { type: 'gong', createdAt: serverTimestamp() });

        await batch.commit();
    };

    const endNight = async () => {
        const batch = writeBatch(db);

        const vampireVotes: Record<string, number> = {};
        players.forEach(p => {
            if (p.role === 'vampire' && p.isAlive && p.votedId) {
                vampireVotes[p.votedId] = (vampireVotes[p.votedId] || 0) + 1;
            }
        });

        let candidateId: string | null = null;
        let maxVotes = 0;
        Object.entries(vampireVotes).forEach(([pid, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                candidateId = pid;
            }
        });

        const doctorSaveId = players.find(p => p.role === 'doctor' && p.isAlive)?.votedId;

        let killedName = null;
        if (candidateId && candidateId !== doctorSaveId) {
            const killedPlayer = players.find(p => p.id === candidateId);
            if (killedPlayer) {
                killedName = killedPlayer.name;
                batch.update(doc(db, 'games', id, 'players', candidateId), { isAlive: false });
            }
        }

        // Finalize state
        const updatedPlayers = players.map(p => p.id === candidateId && candidateId !== doctorSaveId ? { ...p, isAlive: false } : p);
        const winner = checkWinCondition(updatedPlayers);

        batch.update(doc(db, 'games', id), {
            status: winner ? 'ended' : 'day',
            winner: winner || null,
            countdownEndsAt: null,
            lastDeathInfo: killedName ? i18n.tr.game.playerDied.replace('{name}', killedName) : i18n.tr.game.noOneDied
        });

        players.forEach(p => {
            if (p.votedId) batch.update(doc(db, 'games', id, 'players', p.id), { votedId: null });
        });

        const eventRef = doc(collection(db, 'games', id, 'events'));
        batch.set(eventRef, { type: 'gong', createdAt: serverTimestamp() });

        await batch.commit();
    };

    const endDayVote = async () => {
        const batch = writeBatch(db);

        const votes: Record<string, number> = {};
        players.forEach(p => {
            if (p.isAlive && p.votedId) {
                votes[p.votedId] = (votes[p.votedId] || 0) + 1;
            }
        });

        let candidateId: string | null = null;
        let maxVotes = 0;
        Object.entries(votes).forEach(([pid, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                candidateId = pid;
            }
        });

        let killedName = null;
        if (candidateId) {
            const killedPlayer = players.find(p => p.id === candidateId);
            if (killedPlayer) {
                killedName = killedPlayer.name;
                batch.update(doc(db, 'games', id, 'players', candidateId), { isAlive: false });
            }
        }

        const updatedPlayers = players.map(p => p.id === candidateId ? { ...p, isAlive: false } : p);
        const winner = checkWinCondition(updatedPlayers);

        batch.update(doc(db, 'games', id), {
            status: winner ? 'ended' : 'day',
            winner: winner || null,
            countdownEndsAt: null,
            lastDeathInfo: killedName ? i18n.tr.game.playerDied.replace('{name}', killedName) : i18n.tr.game.noOneDied
        });

        players.forEach(p => {
            if (p.votedId) batch.update(doc(db, 'games', id, 'players', p.id), { votedId: null });
        });

        const eventRef = doc(collection(db, 'games', id, 'events'));
        batch.set(eventRef, { type: 'gong', createdAt: serverTimestamp() });

        await batch.commit();
    };

    const triggerGong = async () => {
        if (!isAdmin) return;
        setAdminModalVisible(true);
    };

    const handleVote = async (targetId: string) => {
        if (!isAlive || !me) return;
        if (me.votedId === targetId) return;

        await updateDoc(doc(db, 'games', id, 'players', me.id), { votedId: targetId });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    if (gameLoading) return <View style={styles.container}><Text style={styles.infoText}>Yükleniyor...</Text></View>;

    const isVampirePhase = game?.status === 'night_vampire';
    const isDoctorPhase = game?.status === 'night_doctor';
    const isDayVotePhase = game?.status === 'day_voting';
    const canVote = (me?.role === 'vampire' && isVampirePhase) || (me?.role === 'doctor' && isDoctorPhase) || isDayVotePhase;
    const isNight = game?.status.includes('night');
    const isEnded = game?.status === 'ended';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Animated.View style={[styles.flashOverlay, { opacity: fadeAnim }]} pointerEvents="none" />

            <View style={styles.header}>
                <Text style={styles.gameId}>{id}</Text>
                <View style={[styles.phaseIndicator, { backgroundColor: isEnded ? Colors.surface : (isNight ? '#311B92' : '#F57F17') }]}>
                    <Text style={styles.phaseText}>
                        {isEnded ? i18n.tr.game.gameEnded :
                            game?.status === 'night_vampire' ? 'VAMPİR SEANSI' :
                                game?.status === 'night_doctor' ? 'DOKTOR SEANSI' :
                                    game?.status === 'day_voting' ? 'GÜNDÜZ OYLAMASI' :
                                        game?.status === 'countdown' ? 'GERİ SAYIM' : 'GÜNDÜZ'}
                    </Text>
                </View>
            </View>

            <View style={styles.main}>
                {isEnded ? (
                    <View style={styles.winContainer}>
                        <Ionicons
                            name={game.winner === 'vampires' ? "skull" : "ribbon"}
                            size={100}
                            color={game.winner === 'vampires' ? Colors.primary : Colors.secondary}
                        />
                        <Text style={[styles.winText, { color: game.winner === 'vampires' ? Colors.primary : Colors.secondary }]}>
                            {game.winner === 'vampires' ? i18n.tr.game.vampiresWin : i18n.tr.game.villagersWin}
                        </Text>
                        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/')}>
                            <Text style={styles.homeBtnText}>Ana Menüye Dön</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* 1. Timer or Status Section */}
                        <View style={styles.statusSection}>
                            {game?.countdownEndsAt ? (
                                <View style={styles.timerContainer}>
                                    <Text style={styles.countdownValue}>{countdown}</Text>
                                    <Text style={styles.countdownLabel}>
                                        {isVampirePhase ? i18n.tr.game.vampireVoting :
                                            isDoctorPhase ? i18n.tr.game.doctorSaving :
                                                isDayVotePhase ? i18n.tr.game.dailyVoting : 'Oyun Başlıyor...'}
                                    </Text>
                                </View>
                            ) : (
                                game?.lastDeathInfo && game?.status === 'day' && (
                                    <View style={styles.deathReport}>
                                        <Text style={styles.reportTitle}>{i18n.tr.game.morningNews}</Text>
                                        <Text style={styles.reportContent}>{game.lastDeathInfo}</Text>
                                    </View>
                                )
                            )}
                        </View>

                        {/* 2. Voting or Player List */}
                        {canVote && isAlive ? (
                            <View style={styles.votingSection}>
                                <Text style={styles.votingTitle}>
                                    {isDayVotePhase ? i18n.tr.game.voteToKill :
                                        isVampirePhase ? i18n.tr.game.vampireVoting : i18n.tr.game.doctorSaving}
                                </Text>
                                <FlatList
                                    data={players.filter(p => p.isAlive && (isVampirePhase ? p.role !== 'vampire' : p.id !== me.id))}
                                    keyExtractor={p => p.id}
                                    style={styles.voteList}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.voteItem, me?.votedId === item.id && styles.voteItemActive]}
                                            onPress={() => handleVote(item.id)}
                                        >
                                            <View style={styles.voteItemLeft}>
                                                <View style={styles.avatarPlaceholder}>
                                                    <Ionicons name="person" size={20} color="#666" />
                                                </View>
                                                <Text style={styles.voteName}>{item.name}</Text>
                                            </View>
                                            {me?.votedId === item.id && <Ionicons name="checkmark-circle" size={24} color={Colors.success} />}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        ) : (
                            <View style={styles.playerListSection}>
                                <Text style={styles.sectionTitle}>{i18n.tr.lobby.playerList}</Text>
                                <FlatList
                                    data={players}
                                    keyExtractor={p => p.id}
                                    style={styles.voteList}
                                    renderItem={({ item }) => (
                                        <View style={[styles.playerStatusItem, !item.isAlive && styles.deadPlayerItem]}>
                                            <View style={styles.voteItemLeft}>
                                                <View style={[styles.avatarPlaceholder, !item.isAlive && { backgroundColor: '#222' }]}>
                                                    <Ionicons name={item.isAlive ? "person" : "skull"} size={18} color={item.isAlive ? "#888" : Colors.error} />
                                                </View>
                                                <Text style={[styles.playerNameText, !item.isAlive && styles.deadPlayerName]}>{item.name}</Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: item.isAlive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(229, 57, 53, 0.1)' }]}>
                                                <Text style={[styles.statusBadgeText, { color: item.isAlive ? Colors.success : Colors.error }]}>
                                                    {item.isAlive ? 'HAYATTA' : 'ÖLÜ'}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                />
                            </View>
                        )}

                        {/* 3. Role Info Section */}
                        <View style={[styles.roleSection, (canVote && isAlive) && styles.roleSectionSmall]}>
                            <View style={styles.roleCard}>
                                <View style={styles.roleCardHeader}>
                                    <Text style={styles.yourRoleLabel}>{i18n.tr.game.yourRole}</Text>
                                    <TouchableOpacity style={styles.visibilityBtn} onPress={() => setShowRole(!showRole)}>
                                        <Ionicons name={showRole ? "eye-off" : "eye"} size={20} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                {showRole ? (
                                    <View style={styles.roleDisplay}>
                                        <Text style={[styles.roleValue, { color: me?.role === 'vampire' ? Colors.primary : Colors.secondary }]}>
                                            {me?.role?.toUpperCase() === 'VAMPIRE' ? i18n.tr.game.vampire :
                                                (me?.role?.toUpperCase() === 'DOCTOR' ? i18n.tr.game.doctor : i18n.tr.game.villager)}
                                        </Text>
                                        {!isAlive && <Text style={styles.deadTag}>(ÖLÜ)</Text>}
                                    </View>
                                ) : (
                                    <Text style={[styles.roleValue, { color: '#333' }]}>••••••••</Text>
                                )}
                            </View>
                        </View>
                    </>
                )}
            </View>

            {isAdmin && !isEnded && (
                <View style={styles.adminControls}>
                    <TouchableOpacity style={[styles.adminButton, { backgroundColor: Colors.primary }]} onPress={triggerGong}>
                        <Ionicons name="notifications" size={32} color={Colors.text} />
                        <Text style={styles.adminButtonText}>GONG / AKSIYON</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Modal transparent visible={adminModalVisible} animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Aksiyon Seç</Text>

                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={async () => {
                                setAdminModalVisible(false);
                                await addDoc(collection(db, 'games', id, 'events'), { type: 'gong', createdAt: serverTimestamp() });
                            }}
                        >
                            <Ionicons name="volume-medium" size={24} color={Colors.text} />
                            <Text style={styles.modalBtnText}>Sadece Gong Çal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#311B92' }]}
                            onPress={async () => {
                                setAdminModalVisible(false);
                                await startNextPhase('night_vampire', 30);
                            }}
                        >
                            <Ionicons name="moon" size={24} color={Colors.text} />
                            <Text style={styles.modalBtnText}>{i18n.tr.game.startNightConfirm}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#F57F17' }]}
                            onPress={async () => {
                                setAdminModalVisible(false);
                                await startNextPhase('day_voting', 15);
                            }}
                        >
                            <Ionicons name="people" size={24} color={Colors.text} />
                            <Text style={styles.modalBtnText}>{i18n.tr.game.startDailyVote}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalClose} onPress={() => setAdminModalVisible(false)}>
                            <Text style={{ color: Colors.textSecondary }}>Vazgeç</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'white', zIndex: 999 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
    gameId: { color: Colors.textSecondary, fontSize: 16, fontWeight: 'bold' },
    phaseIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    phaseText: { color: Colors.text, fontWeight: 'bold', fontSize: 10 },
    main: { flex: 1, paddingHorizontal: 24 },
    statusSection: { height: height * 0.15, justifyContent: 'center', alignItems: 'center' },
    timerContainer: { alignItems: 'center' },
    countdownValue: { fontSize: 80, fontWeight: '900', color: Colors.text, lineHeight: 80 },
    countdownLabel: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
    deathReport: { width: '100%', backgroundColor: 'rgba(229, 57, 53, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)' },
    reportTitle: { color: Colors.primary, fontWeight: 'bold', fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
    reportContent: { color: Colors.text, fontSize: 18, fontWeight: '500' },
    votingSection: { flex: 1, marginVertical: 12 },
    votingTitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: 12, textAlign: 'center', fontWeight: 'bold' },
    voteList: { flex: 1 },
    voteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
    voteItemActive: { borderColor: Colors.success, backgroundColor: 'rgba(76, 175, 80, 0.1)' },
    voteItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    voteName: { color: Colors.text, fontSize: 18, fontWeight: '600' },
    playerListSection: { flex: 1, marginVertical: 12 },
    sectionTitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: 12, textAlign: 'center', fontWeight: 'bold' },
    playerStatusItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
    deadPlayerItem: { opacity: 0.6 },
    playerNameText: { color: Colors.text, fontSize: 18, fontWeight: '600' },
    deadPlayerName: { textDecorationLine: 'line-through', color: Colors.textSecondary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
    roleSection: { paddingBottom: 20 },
    roleSectionSmall: { paddingBottom: 10 },
    roleCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#333' },
    roleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    yourRoleLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: 'bold', textTransform: 'uppercase' },
    roleDisplay: { alignItems: 'flex-start' },
    roleValue: { fontSize: 32, fontWeight: 'bold', color: Colors.text },
    deadTag: { color: Colors.error, fontSize: 14, fontWeight: 'bold', marginTop: -4 },
    visibilityBtn: { padding: 4 },
    adminControls: { flexDirection: 'row', padding: 24, gap: 16, paddingBottom: 40 },
    adminButton: { flex: 1, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 4 },
    adminButtonText: { color: Colors.text, fontSize: 10, fontWeight: 'bold' },
    infoText: { color: Colors.text, fontSize: 18, textAlign: 'center', marginTop: 100 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: Colors.surface, width: '100%', borderRadius: 28, padding: 24, gap: 16, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
    modalBtn: { height: 60, borderRadius: 18, backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16 },
    modalBtnText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
    modalClose: { alignSelf: 'center', marginTop: 12, padding: 8 },
    winContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
    winText: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
    homeBtn: { backgroundColor: Colors.surface, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
    homeBtnText: { color: Colors.text, fontWeight: 'bold' }
});
