import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/db';
import { generateUUID } from '../lib/utils';
import type { Card, TextCard, ImageCard, CompositionCard, TextQA, BaseCard, Mask } from '../types';
import { Button } from '../components/Button';
import { ArrowLeftIcon, PlusIcon, TrashIcon, PhotoIcon, QuestionMarkCircleIcon, LightbulbIcon, BrainCircuitIcon, LinkIcon } from '../components/Icons';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { useIndexedDBImage } from '../hooks/useIndexedDBImage';
import { translateText, extractPhrases } from '../lib/gemini';

const isTextCard = (card: Card | Partial<Card> | null): card is TextCard => card?.type === 'text';
const isImageCard = (card: Card | Partial<Card> | null): card is ImageCard => card?.type === 'image';
const isCompositionCard = (card: Card | Partial<Card> | null): card is CompositionCard => card?.type === 'composition';

const MaskingTool: React.FC<{
    imageId: string;
    cardName: string;
    masks: Mask[];
    onMasksChange: (masks: Mask[]) => void;
}> = ({ imageId, cardName, masks, onMasksChange }) => {
    const { imageUrl, loading } = useIndexedDBImage(imageId);
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
    const [currentRect, setCurrentRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedMaskIds, setSelectedMaskIds] = useState(new Set<string>());

    const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } | null => {
        if (!svgRef.current) return null;
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        return pt.matrixTransform(ctm.inverse());
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        const pt = getSVGPoint(e);
        if (pt) setStartPoint({ x: pt.x, y: pt.y });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!startPoint) return;
        const pt = getSVGPoint(e);
        if (!pt) return;

        const x = Math.min(startPoint.x, pt.x);
        const y = Math.min(startPoint.y, pt.y);
        const width = Math.abs(startPoint.x - pt.x);
        const height = Math.abs(startPoint.y - pt.y);
        setCurrentRect({ x, y, width, height });
    };

    const handleMouseUp = () => {
        if (startPoint && currentRect && currentRect.width > 5 && currentRect.height > 5) {
            const newMask: Mask = {
                id: generateUUID(),
                name: `Mask ${masks.length + 1}`,
                rect: currentRect,
                isQuestion: true,
            };
            onMasksChange([...masks, newMask]);
        }
        setStartPoint(null);
        setCurrentRect(null);
    };

    const updateMask = (id: string, updatedProps: Partial<Mask>) => {
        onMasksChange(masks.map(m => m.id === id ? { ...m, ...updatedProps } : m));
    };

    const deleteMask = (id: string) => {
        onMasksChange(masks.filter(m => m.id !== id));
    };

    const handleToggleSelectMask = (id: string) => {
        const newSelection = new Set(selectedMaskIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedMaskIds(newSelection);
    };

    const handleLinkMasks = () => {
        if (selectedMaskIds.size < 2) return;
        const groupId = generateUUID();
        onMasksChange(masks.map(m => selectedMaskIds.has(m.id) ? { ...m, groupId } : m));
        setSelectedMaskIds(new Set());
    };

    const handleUnlinkGroup = (groupId: string) => {
        onMasksChange(masks.map(m => m.groupId === groupId ? { ...m, groupId: undefined } : m));
    };

    const groupedMasks = useMemo(() => {
        const grouped = new Map<string, Mask[]>();
        const ungrouped: Mask[] = [];
        masks.forEach(mask => {
            if (mask.groupId) {
                if (!grouped.has(mask.groupId)) {
                    grouped.set(mask.groupId, []);
                }
                grouped.get(mask.groupId)!.push(mask);
            } else {
                ungrouped.push(mask);
            }
        });
        return { grouped, ungrouped };
    }, [masks]);

    if (loading) {
        return <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center rounded-md"><PhotoIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" /></div>;
    }

    return (
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click and drag on the image to create rectangular masks.</p>
            <div className="relative w-full max-w-full mx-auto" onMouseLeave={handleMouseUp}>
                <img ref={imageRef} src={imageUrl!} alt={cardName} className="w-full h-auto object-contain rounded-md select-none pointer-events-none" onLoad={(e) => e.currentTarget.parentElement?.style.setProperty('--aspect-ratio', `${e.currentTarget.naturalWidth} / ${e.currentTarget.naturalHeight}`)} />
                <svg
                    ref={svgRef}
                    className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                    viewBox={`0 0 ${imageRef.current?.naturalWidth || 0} ${imageRef.current?.naturalHeight || 0}`}
                    preserveAspectRatio="none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    {masks.map((mask) => (
                        <rect key={mask.id} {...mask.rect} strokeWidth="2" stroke={mask.groupId ? "rgba(234, 179, 8, 0.7)" : "rgba(79, 70, 229, 0.7)"} fill={mask.groupId ? "rgba(234, 179, 8, 0.4)" : "rgba(99, 102, 241, 0.4)"} />
                    ))}
                    {currentRect && (
                        <rect {...currentRect} strokeWidth="2" stroke="rgba(239, 68, 68, 0.9)" fill="rgba(248, 113, 113, 0.5)" />
                    )}
                </svg>
            </div>
            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold">Masks ({masks.length})</h3>
                    <Button size="sm" variant="secondary" onClick={handleLinkMasks} disabled={selectedMaskIds.size < 2}>
                        <LinkIcon className="w-4 h-4 mr-2" /> Link Selected ({selectedMaskIds.size})
                    </Button>
                </div>
                {masks.length === 0 && <p className="text-sm text-gray-500">No masks created yet.</p>}

                {Array.from(groupedMasks.grouped.entries()).map(([groupId, group]) => (
                    <div key={groupId} className="border-2 border-yellow-500/50 rounded-lg p-2 space-y-2">
                        {group.map((mask) => (
                            <div key={mask.id} className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                <input type="checkbox" checked={selectedMaskIds.has(mask.id)} onChange={() => handleToggleSelectMask(mask.id)} className="form-checkbox h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-indigo-600 focus:ring-indigo-500" />
                                <input type="text" value={mask.name} onChange={(e) => updateMask(mask.id, { name: e.target.value })} placeholder={`Mask name`} className="flex-grow bg-transparent focus:outline-none p-1 rounded" />
                                <button onClick={() => updateMask(mask.id, { isQuestion: !mask.isQuestion })} className={`p-2 rounded-full ${mask.isQuestion ? 'text-blue-400 bg-blue-900/50' : 'text-yellow-400 bg-yellow-900/50'}`} title={mask.isQuestion ? 'Question' : 'Answer'}>
                                    {mask.isQuestion ? <QuestionMarkCircleIcon className="w-5 h-5" /> : <LightbulbIcon className="w-5 h-5" />}
                                </button>
                                <Button variant="ghost" size="sm" onClick={() => deleteMask(mask.id)} className="!p-2"><TrashIcon className="w-5 h-5" /></Button>
                            </div>
                        ))}
                         <Button size="sm" variant="ghost" onClick={() => handleUnlinkGroup(groupId)} className="w-full text-xs">Unlink Group</Button>
                    </div>
                ))}
                
                {groupedMasks.ungrouped.map((mask) => (
                    <div key={mask.id} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                        <input type="checkbox" checked={selectedMaskIds.has(mask.id)} onChange={() => handleToggleSelectMask(mask.id)} className="form-checkbox h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-indigo-600 focus:ring-indigo-500" />
                        <input type="text" value={mask.name} onChange={(e) => updateMask(mask.id, { name: e.target.value })} placeholder={`Mask name`} className="flex-grow bg-transparent focus:outline-none p-1 rounded" />
                        <button onClick={() => updateMask(mask.id, { isQuestion: !mask.isQuestion })} className={`p-2 rounded-full ${mask.isQuestion ? 'text-blue-400 bg-blue-900/50' : 'text-yellow-400 bg-yellow-900/50'}`} title={mask.isQuestion ? 'Question' : 'Answer'}>
                            {mask.isQuestion ? <QuestionMarkCircleIcon className="w-5 h-5" /> : <LightbulbIcon className="w-5 h-5" />}
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMask(mask.id)} className="!p-2"><TrashIcon className="w-5 h-5" /></Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CardEditScreen: React.FC = () => {
    const { currentDeckId, currentCardId, setScreen, screenParams } = useAppStore();
    const [card, setCard] = useState<Partial<Card> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const { addToast } = useToast();
    const isEditing = !!currentCardId;

    useEffect(() => {
        const loadCard = async () => {
            if (isEditing) {
                const existingCard = await db.getCardById(currentCardId!);
                if (existingCard) setCard(existingCard);
                else { addToast({ message: "Error: Card not found.", type: 'error' }); handleCancel(); }
            } else {
                const cardType = screenParams?.cardType || 'text';
                let newCard: Partial<Card>;
                if (cardType === 'composition') {
                    newCard = { type: 'composition', name: '', tags: [], memo: '', sourceJapanese: '', translatedEnglish: '', extractedPhrases: [] };
                } else {
                    newCard = { type: 'text', name: '', tags: [], memo: '', textQAs: [{ id: generateUUID(), question: '', answer: '' }] };
                }
                setCard(newCard);
            }
            setIsLoading(false);
        };
        loadCard();
    }, [currentCardId, isEditing, screenParams]);

    const handleCancel = () => setScreen('cards', currentDeckId || undefined);

    const handleSave = async () => {
        if (!card || !card.name?.trim()) {
            addToast({ message: 'Card name is required.', type: 'error' }); return;
        }
        setIsLoading(true);
        try {
            if (isEditing && card.id) {
                await db.updateCard(card.id, card);
                addToast({ message: 'Card updated.', type: 'success' });
            } else {
                const newCard: Card = {
                    id: generateUUID(),
                    deckId: currentDeckId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ...card,
                } as Card;
                await db.addCard(newCard);
                addToast({ message: 'Card created.', type: 'success' });
            }
            handleCancel();
        } catch (error) {
            addToast({ message: 'Failed to save card.', type: 'error' });
            setIsLoading(false);
        }
    };

    const handleTranslate = async () => {
        if (!isCompositionCard(card) || !card.sourceJapanese || isAiLoading) return;
        setIsAiLoading(true);
        const translation = await translateText(card.sourceJapanese);
        setCard(prev => prev ? { ...prev, translatedEnglish: translation } : null);
        setIsAiLoading(false);
    };

    const handleExtractPhrases = async () => {
        if (!isCompositionCard(card) || !card.sourceJapanese || isAiLoading) return;
        setIsAiLoading(true);
        const phrases = await extractPhrases(card.sourceJapanese);
        setCard(prev => prev ? { ...prev, extractedPhrases: phrases } : null);
        addToast({ message: `${phrases.length} phrases extracted.`, type: 'success' });
        setIsAiLoading(false);
    };

    const handleFieldChange = (field: keyof BaseCard | keyof CompositionCard, value: any) => setCard(prev => prev ? { ...prev, [field]: value } : null);
    const handleMasksChange = (newMasks: Mask[]) => setCard(prev => isImageCard(prev) ? { ...prev, masks: newMasks } : prev);
    const handleQAChange = (index: number, field: 'question' | 'answer', value: string) => setCard(prev => {
        if (!isTextCard(prev) || !prev.textQAs) return prev;
        const newQAs = [...prev.textQAs];
        newQAs[index] = { ...newQAs[index], [field]: value };
        return { ...prev, textQAs: newQAs };
    });
    const addQA = () => setCard(prev => isTextCard(prev) ? { ...prev, textQAs: [...(prev.textQAs || []), { id: generateUUID(), question: '', answer: '' }] } : prev);
    const removeQA = (index: number) => setCard(prev => isTextCard(prev) && prev.textQAs && prev.textQAs.length > 1 ? { ...prev, textQAs: prev.textQAs.filter((_, i) => i !== index) } : prev);

    if (isLoading || !card) return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="flex items-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                <Button variant="ghost" size="sm" onClick={handleCancel} className="mr-4 !p-2"><ArrowLeftIcon className="w-6 h-6" /></Button>
                <h1 className="text-xl font-bold">{isEditing ? 'Edit Card' : 'Create New Card'}</h1>
                <div className="ml-auto flex gap-2"><Button variant="secondary" onClick={handleCancel}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                        <div className="space-y-4">
                            <div><label htmlFor="cardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Card Name</label><input type="text" id="cardName" value={card.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>
                            <div><label htmlFor="cardMemo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Memo</label><textarea id="cardMemo" value={card.memo} onChange={(e) => handleFieldChange('memo', e.target.value)} rows={3} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>
                        </div>
                    </div>

                    {isImageCard(card) && card.imageId && (<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"><h2 className="text-lg font-semibold mb-4">Masking Tool</h2><MaskingTool imageId={card.imageId} cardName={card.name || 'Card Image'} masks={card.masks || []} onMasksChange={handleMasksChange} /></div>)}
                    
                    {isCompositionCard(card) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-4">
                             <div><h2 className="text-lg font-semibold">Composition Content (AI)</h2></div>
                             <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Japanese Source</label><textarea value={card.sourceJapanese} onChange={(e) => handleFieldChange('sourceJapanese', e.target.value)} rows={4} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm" placeholder="ここに日本語の文章を入力..." /></div>
                             <Button onClick={handleTranslate} disabled={isAiLoading || !card.sourceJapanese}><BrainCircuitIcon className="w-5 h-5 mr-2" />{isAiLoading ? 'Translating...' : 'Translate to English'}</Button>
                             <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">English Translation</label><textarea value={card.translatedEnglish} rows={4} className="mt-1 block w-full bg-gray-200 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 rounded-md shadow-sm" readOnly /></div>
                             <hr className="dark:border-gray-600"/>
                             <div><h3 className="text-md font-semibold">Extracted Phrases</h3><p className="text-sm text-gray-500 dark:text-gray-400">Translate first, then extract key phrases to study.</p></div>
                             <Button onClick={handleExtractPhrases} variant="secondary" disabled={isAiLoading || !card.translatedEnglish}><BrainCircuitIcon className="w-5 h-5 mr-2" />{isAiLoading ? 'Extracting...' : 'Extract Phrases'}</Button>
                             <div className="space-y-2">{card.extractedPhrases?.map(qa => <div key={qa.id} className="p-2 border dark:border-gray-700 rounded-md text-sm"><p className="font-semibold">{qa.question}</p><p className="text-gray-600 dark:text-gray-400">{qa.answer}</p></div>)}</div>
                        </div>
                    )}

                    {isTextCard(card) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                            <h2 className="text-lg font-semibold mb-4">Questions & Answers</h2>
                            <div className="space-y-4">
                                {card.textQAs?.map((qa, index) => (
                                    <div key={qa.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-md flex gap-4 items-start">
                                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question</label><textarea value={qa.question} onChange={(e) => handleQAChange(index, 'question', e.target.value)} rows={2} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm" /></div>
                                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Answer</label><textarea value={qa.answer} onChange={(e) => handleQAChange(index, 'answer', e.target.value)} rows={2} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm" /></div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => removeQA(index)} disabled={card.textQAs!.length <= 1} className="!p-2 mt-6"><TrashIcon className="w-5 h-5" /></Button>
                                    </div>
                                ))}
                                <Button variant="secondary" size="sm" onClick={addQA}><PlusIcon className="w-4 h-4 mr-2" /> Add Q&A</Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};