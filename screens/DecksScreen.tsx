import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/db';
import type { Deck, Card, ImageCard, ExportedDeck, DeckType, ImageBlob, ExportedImageData } from '../types';
import { generateUUID, formatDate, blobToBase64, base64ToBlob } from '../lib/utils';
import { Button } from '../components/Button';
import { useToast } from '../hooks/useToast';
import { CreateDeckModal } from '../components/CreateDeckModal';
import { PlusIcon, ArrowUpTrayIcon, EllipsisVerticalIcon, ArrowDownTrayIcon } from '../components/Icons';
import { LoadingSpinner } from '../components/LoadingSpinner';


const DeckItem: React.FC<{ deck: Deck; onSelect: () => void; onExport: () => void; }> = ({ deck, onSelect, onExport }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1 relative">
            <div onClick={onSelect} className="p-4 cursor-pointer">
                <h2 className="text-lg font-semibold truncate">{deck.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{deck.type} Deck</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Updated: {formatDate(deck.updatedAt)}</p>
            </div>
            <div ref={menuRef} className="absolute top-2 right-2">
                <Button variant="ghost" size="sm" className="!p-2" onClick={() => setMenuOpen(!menuOpen)}>
                    <EllipsisVerticalIcon className="w-5 h-5" />
                </Button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                            <a href="#" onClick={(e) => { e.preventDefault(); onExport(); setMenuOpen(false); }} className="flex items-center gap-2 text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Export
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export const DecksScreen: React.FC = () => {
    const { setScreen, user, logout } = useAppStore();
    const { addToast } = useToast();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDecks = async () => {
        const allDecks = await db.decks.orderBy('updatedAt').reverse().toArray();
        setDecks(allDecks);
    };

    useEffect(() => {
        fetchDecks();
    }, []);

    const handleCreateDeck = async (name: string, type: DeckType) => {
        const newDeck: Deck = {
            id: generateUUID(),
            name,
            type,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await db.addDeck(newDeck);
        addToast({ message: `Deck "${name}" created.`, type: 'success' });
        fetchDecks();
        setIsModalOpen(false);
    };

    const handleExportDeck = async (deckId: string) => {
        setIsLoading(true);
        addToast({ message: 'Exporting deck...', type: 'info' });
        try {
            const deck = await db.getDeckById(deckId);
            if (!deck) throw new Error('Deck not found');

            const cards = await db.getCardsByDeckId(deckId);
            const images: Record<string, ExportedImageData> = {};

            for (const card of cards) {
                if (card.type === 'image' || card.type === 'mixed') {
                    const imageBlob = await db.getImageBlob((card as ImageCard).imageId);
                    if (imageBlob) {
                        const base64 = await blobToBase64(imageBlob.blob);
                        images[imageBlob.id] = { base64, type: imageBlob.blob.type };
                    }
                }
            }

            const exportedData: ExportedDeck = { deck, cards, images };
            const jsonString = JSON.stringify(exportedData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${deck.name.replace(/\s/g, '_')}_export.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast({ message: 'Deck exported successfully.', type: 'success' });
        } catch (error) {
            console.error('Export failed:', error);
            addToast({ message: 'Failed to export deck.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        addToast({ message: 'Importing deck...', type: 'info' });

        try {
            const text = await file.text();
            const importedData: ExportedDeck = JSON.parse(text);

            const { deck: importedDeck, cards: importedCards, images: importedImages } = importedData;

            const newDeckId = generateUUID();
            const newCardIdMap = new Map<string, string>();
            const newImageIdMap = new Map<string, string>();

            const newDeck: Deck = {
                ...importedDeck,
                id: newDeckId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const newImages: ImageBlob[] = [];
            for (const oldImageId in importedImages) {
                const newImageId = generateUUID();
                newImageIdMap.set(oldImageId, newImageId);
                const { base64, type } = importedImages[oldImageId];
                const blob = await base64ToBlob(base64);
                newImages.push({ id: newImageId, blob });
            }

            const newCards: Card[] = importedCards.map(card => {
                const newCardId = generateUUID();
                newCardIdMap.set(card.id, newCardId);
                const newCard = {
                    ...card,
                    id: newCardId,
                    deckId: newDeckId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                if (newCard.type === 'image' || newCard.type === 'mixed') {
                    const oldImageId = (newCard as ImageCard).imageId;
                    if (newImageIdMap.has(oldImageId)) {
                        (newCard as ImageCard).imageId = newImageIdMap.get(oldImageId)!;
                    }
                }
                return newCard;
            });

            await db.transaction('rw', db.decks, db.cards, db.images, async () => {
                await db.addDeck(newDeck);
                if (newCards.length > 0) await db.addMultipleCards(newCards);
                if (newImages.length > 0) await db.images.bulkAdd(newImages);
            });
            
            addToast({ message: `Deck "${newDeck.name}" imported successfully.`, type: 'success' });
            await fetchDecks();

        } catch (error) {
            console.error('Import failed:', error);
            addToast({ message: 'Failed to import deck. Invalid file format.', type: 'error' });
        } finally {
            setIsLoading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };


    return (
        <div className="h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <LoadingSpinner size="lg" />
                </div>
            )}
            <header className="p-4 flex flex-wrap gap-2 justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold">My Decks</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm hidden sm:inline">{user?.email}</span>
                    <Button variant="secondary" size="sm" onClick={logout}>Logout</Button>
                </div>
            </header>
            <div className="p-4 flex gap-2">
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" /> Create New Deck
                </Button>
                <Button variant="secondary" onClick={handleImportClick}>
                    <ArrowUpTrayIcon className="w-4 h-4 mr-2" /> Import Deck
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
            </div>
            <main className="flex-1 overflow-y-auto p-4">
                {decks.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        <p>You have no decks yet.</p>
                        <p className="text-sm mt-2">Click "Create New Deck" to get started.</p>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {decks.map((deck) => (
                        <DeckItem
                            key={deck.id}
                            deck={deck}
                            onSelect={() => setScreen('cards', deck.id)}
                            onExport={() => handleExportDeck(deck.id)}
                        />
                    ))}
                </div>
            </main>
            {isModalOpen && <CreateDeckModal onCreate={handleCreateDeck} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};