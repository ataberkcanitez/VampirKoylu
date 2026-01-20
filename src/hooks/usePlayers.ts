import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../config/firebase';

export function usePlayers(gameId: string | null) {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!gameId) {
            setLoading(false);
            return;
        }

        const colRef = collection(db, 'games', gameId, 'players');
        const q = query(colRef, orderBy('joinedAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playerList: any[] = [];
            snapshot.forEach((doc) => {
                playerList.push({ id: doc.id, ...doc.data() });
            });
            setPlayers(playerList);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [gameId]);

    return { players, loading };
}
