import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect } from 'react';
import { db } from '../config/firebase';

export function useEvents(gameId: string | null, onEvent?: (event: any) => void) {
    useEffect(() => {
        if (!gameId) return;

        const colRef = collection(db, 'games', gameId, 'events');
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const event = { id: change.doc.id, ...change.doc.data() };
                    if (onEvent) onEvent(event);
                }
            });
        });

        return () => unsubscribe();
    }, [gameId, onEvent]);
}
