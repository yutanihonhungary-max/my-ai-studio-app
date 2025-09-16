import Dexie, { type Table } from 'dexie';
import type { Deck, Card, ImageBlob } from '../types';

class AnkiGenesisDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  images!: Table<ImageBlob, string>;

  constructor() {
    super('AnkiGenesisDB');
    // FIX: All database operations are now methods of this class, which should resolve any type inference issues.
    this.version(1).stores({
      decks: 'id, name, updatedAt',
      cards: 'id, deckId, name, updatedAt, isDeleted',
      images: 'id',
    });
  }

  // --- Deck Operations ---

  getDecks = () => this.decks.orderBy('updatedAt').reverse().toArray();
  addDeck = (deck: Deck) => this.decks.add(deck);
  getDeckById = (id: string) => this.decks.get(id);

  // --- Card Operations ---

  getCardsByDeckId = (deckId: string) => {
    return this.cards
      .where('deckId').equals(deckId)
      .and(card => !card.isDeleted)
      .toArray();
  };

  getCardById = (id: string) => this.cards.get(id);
  addCard = (card: Card) => this.cards.add(card);
  addMultipleCards = (cards: Card[]) => this.cards.bulkAdd(cards);

  updateCard = (id: string, changes: Partial<Card>) => this.cards.update(id, { ...changes, updatedAt: new Date().toISOString() });

  logicallyDeleteCard = (id: string) => {
    return this.cards.update(id, { isDeleted: true, updatedAt: new Date().toISOString() });
  };

  restoreCard = (id: string) => {
      return this.cards.update(id, { isDeleted: false, updatedAt: new Date().toISOString() });
  };

  moveCardsToDeck = (cardIds: string[], newDeckId: string) => {
      return this.cards.where('id').anyOf(cardIds).modify({ deckId: newDeckId, updatedAt: new Date().toISOString() });
  };

  // --- Image Operations ---

  getImageBlob = (id: string) => this.images.get(id);
  addImageBlob = (image: ImageBlob) => this.images.add(image);
}

export const db = new AnkiGenesisDB();