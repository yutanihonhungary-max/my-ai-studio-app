import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useCards } from '../hooks/useCards';
import { db } from '../lib/db';
import type { Deck, Card, ViewMode, SortKey } from '../types';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/Button';
import { CardItem } from '../components/CardItem';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ArrowLeftIcon, PlusIcon, PhotoIcon, SparklesIcon, ListBulletIcon, Squares2X2Icon, TrashIcon, ChevronDownIcon } from '../components/Icons';

const CardsScreenHeader: React.FC<{ deckName: string | undefined; onBack: () => void; }> = ({ deckName, onBack }) => (
    <header className="flex items-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-4 !p-2">
            <ArrowLeftIcon className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{deckName || 'Loading Deck...'}</h1>
    </header>
);

const NewCardButton: React.FC<{ onNewCard: (type: 'text' | 'composition') => void }> = ({ onNewCard }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <Button size="md" onClick={() => setIsOpen(!isOpen)}>
                <PlusIcon className="w-4 h-4 mr-2" /> New Card <ChevronDownIcon className="w-4 h-4 ml-2" />
            </Button>
            {isOpen && (
                <div className="absolute z-20 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <a href="#" onClick={(e) => { e.preventDefault(); onNewCard('text'); setIsOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                            Text Card
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onNewCard('composition'); setIsOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                            Composition (AI)
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};


const ActionBar: React.FC<{
    onAddImages: (files: FileList) => void;
    onNewCard: (type: 'text' | 'composition') => void;
    onStartQuiz: () => void;
    selectionMode: boolean;
    toggleSelectionMode: () => void;
    onDeleteSelected: () => void;
    selectedCount: number;
}> = ({ onAddImages, onNewCard, onStartQuiz, selectionMode, toggleSelectionMode, onDeleteSelected, selectedCount }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="p-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
            {!selectionMode ? (
                <>
                    <NewCardButton onNewCard={onNewCard} />
                    <Button size="md" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <PhotoIcon className="w-4 h-4 mr-2" /> Add Images
                    </Button>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && onAddImages(e.target.files)} />
                    <Button size="md" variant="secondary" onClick={onStartQuiz}><SparklesIcon className="w-4 h-4 mr-2" /> Start Quiz</Button>
                    <Button size="md" variant="ghost" onClick={toggleSelectionMode} className="ml-auto">Select</Button>
                </>
            ) : (
                <>
                    <span className="font-semibold self-center text-gray-700 dark:text-gray-300">{selectedCount} selected</span>
                    <div className="flex-grow" />
                    <Button size="md" variant="danger" onClick={onDeleteSelected} disabled={selectedCount === 0}>
                        <TrashIcon className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <Button size="md" variant="secondary" onClick={toggleSelectionMode}>Cancel</Button>
                </>
            )}
        </div>
    );
};

const ViewControls: React.FC<{
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    sortKey: SortKey;
    setSortKey: (key: SortKey) => void;
}> = ({ viewMode, setViewMode, sortKey, setSortKey }) => (
    <div className="px-4 py-2 flex items-center justify-between">
        <div className="relative">
            <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1 pl-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="updatedAt">Sort by Update</option>
                <option value="createdAt">Sort by Create</option>
                <option value="name">Sort by Name</option>
            </select>
            <ChevronDownIcon className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md bg-gray-200 dark:bg-gray-700">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <ListBulletIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);

export const CardsScreen: React.FC = () => {
    const { currentDeckId, setScreen } = useAppStore();
    const { cards, loading, error, addImageCards, logicallyDeleteCard, restoreCard } = useCards(currentDeckId);
    const [deck, setDeck] = useState<Deck | undefined>(undefined);
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (currentDeckId) {
            db.getDeckById(currentDeckId).then(setDeck);
        }
    }, [currentDeckId]);

    const sortedCards = useMemo(() => {
        return [...cards].sort((a, b) => {
            if (sortKey === 'name') {
                return a.name.localeCompare(b.name);
            }
            return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime();
        });
    }, [cards, sortKey]);

    const handleBack = () => setScreen('decks');
    const handleNewCard = (type: 'text' | 'composition') => {
        setScreen('editCard', currentDeckId || undefined, undefined, { cardType: type });
    };
    const handleEditCard = (cardId: string) => setScreen('editCard', currentDeckId || undefined, cardId);
    const handleStartQuiz = () => setScreen('quiz', currentDeckId || undefined);

    const handleDeleteCard = async (cardId: string) => {
        const success = await logicallyDeleteCard(cardId);
        if (success) {
            addToast({
                message: 'Card moved to trash.',
                type: 'info',
                action: {
                    label: 'Undo',
                    onClick: () => restoreCard(cardId),
                },
            });
        } else {
            addToast({ message: 'Failed to delete card.', type: 'error' });
        }
    };

    const handleAddImages = async (files: FileList) => {
        await addImageCards(Array.from(files));
        addToast({ message: `${files.length} image(s) added as new cards.`, type: 'success' });
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedCards(new Set());
    };

    const handleSelectCard = (cardId: string) => {
        const newSelection = new Set(selectedCards);
        if (newSelection.has(cardId)) {
            newSelection.delete(cardId);
        } else {
            newSelection.add(cardId);
        }
        setSelectedCards(newSelection);
    };

    const handleDeleteSelected = async () => {
        const cardIds = Array.from(selectedCards);
        for (const cardId of cardIds) {
            await logicallyDeleteCard(cardId);
        }
        addToast({ message: `${cardIds.length} cards moved to trash.`, type: 'success' });
        toggleSelectionMode();
    };


    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <CardsScreenHeader deckName={deck?.name} onBack={handleBack} />
            <ActionBar
                onAddImages={handleAddImages}
                onNewCard={handleNewCard}
                onStartQuiz={handleStartQuiz}
                selectionMode={selectionMode}
                toggleSelectionMode={toggleSelectionMode}
                onDeleteSelected={handleDeleteSelected}
                selectedCount={selectedCards.size}
            />
            <ViewControls viewMode={viewMode} setViewMode={setViewMode} sortKey={sortKey} setSortKey={setSortKey} />
            <main className="flex-1 overflow-y-auto p-4">
                {loading && <div className="flex justify-center mt-8"><LoadingSpinner /></div>}
                {error && <div className="text-center text-red-500">Error: {error.message}</div>}
                {!loading && sortedCards.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        <p>This deck has no cards.</p>
                        <p className="text-sm mt-2">Click "New Card" or "Add Images" to get started.</p>
                    </div>
                )}
                {!loading && sortedCards.length > 0 && (
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                        : 'flex flex-col gap-3'}>
                        {sortedCards.map((card) => (
                            <CardItem
                                key={card.id}
                                card={card}
                                viewMode={viewMode}
                                onDelete={handleDeleteCard}
                                onEdit={handleEditCard}
                                isSelected={selectedCards.has(card.id)}
                                onSelect={handleSelectCard}
                                selectionMode={selectionMode}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};