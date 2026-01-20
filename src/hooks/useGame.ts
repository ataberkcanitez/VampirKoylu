import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../config/firebase';

export function useGame(gameId: string | null) {
    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!gameId) {
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'games', gameId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setGame({ id: docSnap.id, ...docSnap.data() });
            } else {
                setError('Game not found');
            }
            setLoading(false);
        }, (err) => {
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [gameId]);

    return { game, loading, error };
}
