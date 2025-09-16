import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { generateUUID } from '../lib/utils';
import type { Card, ImageCard } from '../types';

export const useCards = (deckId: string | null) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCards = useCallback(async () => {
    if (!deckId) {
      setCards([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const fetchedCards = await db.cards
        .where('deckId').equals(deckId)
        .and(card => !card.isDeleted)
        .sortBy('updatedAt');
      setCards(fetchedCards.reverse());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch cards'));
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);
  
  const addImageCards = async (files: File[]) => {
    if (!deckId) return;
    setLoading(true);
    try {
        const newCards: ImageCard[] = [];
        for (const file of files) {
            const imageId = generateUUID();
            await db.images.add({ id: imageId, blob: file });

            const newCard: ImageCard = {
                id: generateUUID(),
                deckId,
                name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
                type: 'image',
                imageId: imageId,
                masks: [],
                tags: [],
                memo: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDeleted: false,
            };
            newCards.push(newCard);
        }
        await db.cards.bulkAdd(newCards);
        await fetchCards();
    } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add image cards'));
    } finally {
        setLoading(false);
    }
  };

  const logicallyDeleteCard = async (cardId: string) => {
    try {
      // FIX: This call is now valid as logicallyDeleteCard is a method on the db instance.
      await db.logicallyDeleteCard(cardId);
      await fetchCards();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete card'));
      return false;
    }
  };

  const restoreCard = async (cardId: string) => {
      try {
          // FIX: This call is now valid as restoreCard is a method on the db instance.
          await db.restoreCard(cardId);
          await fetchCards();
      } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to restore card'));
      }
  };

  return { cards, loading, error, fetchCards, addImageCards, logicallyDeleteCard, restoreCard };
};
