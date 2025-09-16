import React, { useState } from 'react';
import { Button } from './Button';
import type { DeckType } from '../types';

interface CreateDeckModalProps {
  onClose: () => void;
  onCreate: (name: string, type: DeckType) => void;
}

export const CreateDeckModal: React.FC<CreateDeckModalProps> = ({ onClose, onCreate }) => {
  const [deckName, setDeckName] = useState('');
  const [deckType, setDeckType] = useState<DeckType>('text');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deckName.trim()) {
      onCreate(deckName.trim(), deckType);
    }
  };

  const deckTypes: { value: DeckType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'image', label: 'Image' },
    { value: 'composition', label: 'Composition (AI)' },
    { value: 'mixed', label: 'Mixed' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Deck</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="deckName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deck Name
                </label>
                <input
                  type="text"
                  id="deckName"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Japanese Vocabulary"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="deckType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deck Type
                </label>
                <select
                  id="deckType"
                  value={deckType}
                  onChange={(e) => setDeckType(e.target.value as DeckType)}
                  className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {deckTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 flex justify-end gap-3 rounded-b-lg">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!deckName.trim()}>
              Create Deck
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};