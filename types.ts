export type DeckType = 'image' | 'text' | 'mixed' | 'composition';
export type CardStatus = 'new' | 'correct' | 'incorrect';
export type Screen = 'login' | 'decks' | 'cards' | 'editCard' | 'quiz';
export type Theme = 'light' | 'dark' | 'space';
export type Language = 'en' | 'ja';
export type ViewMode = 'grid' | 'list';
export type SortKey = 'updatedAt' | 'createdAt' | 'name';

export interface Deck {
  id: string; // uuid
  name: string;
  type: DeckType;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  ownerId?: string;
}

export interface BaseCard {
  id: string; // uuid
  deckId: string | null;
  name: string;
  tags: string[];
  memo: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  ownerId?: string;
  isDeleted?: boolean;
}

export interface Mask {
  id: string;
  name: string;
  rect: { x: number; y: number; width: number; height: number; };
  isQuestion: boolean;
  groupId?: string;
}

export interface TextQA {
  id: string;
  question: string;
  answer: string;
}

export interface ImageCard extends BaseCard {
  type: 'image';
  imageId: string; // IndexedDB key for blob
  imageUrl?: string; // Firebase Storage URL
  masks: Mask[];
}

export interface TextCard extends BaseCard {
  type: 'text';
  textQAs: TextQA[];
}

export interface CompositionCard extends BaseCard {
  type: 'composition';
  sourceJapanese: string;
  translatedEnglish: string;
  extractedPhrases?: TextQA[];
}

export interface MixedCard extends BaseCard {
  type: 'mixed';
  imageId: string;
  imageUrl?: string;
  masks: Mask[];
  textQAs: TextQA[];
}

export type Card = ImageCard | TextCard | CompositionCard | MixedCard;

export interface ImageBlob {
  id: string;
  blob: Blob;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ExportedImageData {
  base64: string;
  type: string; // MIME type
}

export interface ExportedDeck {
  deck: Deck;
  cards: Card[];
  images: Record<string, ExportedImageData>; // imageId -> { base64, type }
}