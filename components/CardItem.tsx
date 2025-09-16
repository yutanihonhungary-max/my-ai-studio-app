import React from 'react';
import type { Card } from '../types';
import { useIndexedDBImage } from '../hooks/useIndexedDBImage';
import { formatDate } from '../lib/utils';
import { PhotoIcon, TrashIcon } from './Icons';

interface CardItemProps {
  card: Card;
  viewMode: 'grid' | 'list';
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string) => void;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
  selectionMode: boolean;
}

const CardImage: React.FC<{ imageId: string; cardName: string }> = ({ imageId, cardName }) => {
    const { imageUrl, loading } = useIndexedDBImage(imageId);

    if (loading) {
        return <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center"><PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" /></div>;
    }

    if (imageUrl) {
        return <img src={imageUrl} alt={cardName} className="w-full h-full object-cover" />;
    }

    return <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" /></div>;
};


export const CardItem: React.FC<CardItemProps> = ({ card, viewMode, onDelete, onEdit, isSelected, onSelect, selectionMode }) => {
  const content = (
    <>
      <div className={`relative ${viewMode === 'grid' ? 'aspect-video' : 'w-24 h-16 flex-shrink-0'} overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800`}>
        {card.type === 'image' || card.type === 'mixed' ? (
            <CardImage imageId={card.imageId} cardName={card.name} />
        ) : (
            <div className="p-2 text-xs text-gray-600 dark:text-gray-400">
                {(card as any).textQAs?.[0]?.question || card.name}
            </div>
        )}
      </div>
      <div className="flex-1 p-3 overflow-hidden">
        <h3 className="font-semibold truncate text-gray-800 dark:text-gray-100">{card.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Updated: {formatDate(card.updatedAt)}</p>
      </div>
    </>
  );

  const handleClick = () => {
    if (selectionMode) {
      onSelect(card.id);
    } else {
      onEdit(card.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div onClick={handleClick} className={`flex items-center bg-white dark:bg-gray-800/50 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-transparent dark:border-gray-700'}`}>
        {content}
        <div className="p-3">
          <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`relative flex flex-col bg-white dark:bg-gray-800/50 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-transparent dark:border-gray-700'}`}>
      {content}
      <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-red-600 transition-colors">
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
};