import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/db';
import type { Deck, Card, ImageCard, Mask, TextQA } from '../types';
import { Button } from '../components/Button';
import { ArrowLeftIcon, SparklesIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useIndexedDBImage } from '../hooks/useIndexedDBImage';

type QuizItem = {
    card: Card;
    item: TextQA | Mask[]; // A single Q&A or a group of masks
    type: 'text' | 'image' | 'composition';
}

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
};

const generateQuizItemsFromCards = (cards: Card[]): QuizItem[] => {
    const items: QuizItem[] = [];
    cards.forEach(card => {
        if (card.type === 'text' && card.textQAs) {
            card.textQAs.forEach(qa => items.push({ card, item: qa, type: 'text' }));
        } else if (card.type === 'composition') {
            const phrases = card.extractedPhrases?.length ? card.extractedPhrases : [];
            if (phrases.length > 0) {
                 phrases.forEach(qa => items.push({ card, item: qa, type: 'composition' }));
            } else {
                 items.push({ card, item: { id: 'main', question: card.sourceJapanese, answer: card.translatedEnglish }, type: 'composition' });
            }
        } else if (card.type === 'image' && card.masks) {
            const groupedMasks = new Map<string, Mask[]>();
            const ungroupedMasks: Mask[] = [];
            card.masks.forEach(mask => {
                if (mask.groupId) {
                    if (!groupedMasks.has(mask.groupId)) {
                        groupedMasks.set(mask.groupId, []);
                    }
                    groupedMasks.get(mask.groupId)!.push(mask);
                } else {
                    ungroupedMasks.push(mask);
                }
            });
            groupedMasks.forEach(group => items.push({ card, item: group, type: 'image' }));
            ungroupedMasks.forEach(mask => items.push({ card, item: [mask], type: 'image' }));
        }
    });
    return items;
};

const ImageCardQuiz: React.FC<{ card: ImageCard; maskGroup: Mask[]; showAnswer: boolean }> = ({ card, maskGroup, showAnswer }) => {
    const { imageUrl, loading } = useIndexedDBImage(card.imageId);
    const [dimensions, setDimensions] = useState({ width: 1, height: 1 });

    if (loading) return <div className="w-full aspect-video bg-gray-700 animate-pulse rounded-lg" />;

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <img
                src={imageUrl!}
                alt={card.name}
                className="w-full h-auto rounded-lg"
                onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0) {
                        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }
                }}
            />
            <svg className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="xMidYMid meet">
                {maskGroup.map(mask => {
                    if (mask.isQuestion) {
                        return <rect key={mask.id} {...mask.rect} className={`transition-opacity duration-300 ${showAnswer ? 'fill-blue-500/30' : 'fill-gray-800 dark:fill-gray-900'}`} />;
                    }
                    if (showAnswer && !mask.isQuestion) {
                         return <rect key={mask.id} {...mask.rect} className="fill-yellow-400/50" />;
                    }
                    return null;
                })}
            </svg>
        </div>
    );
};

const QuizResultScreen: React.FC<{ score: number; total: number; onRestart: () => void; onBack: () => void; }> = ({ score, total, onRestart, onBack }) => (
    <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
        <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-xl text-gray-600 dark:text-gray-400">Your score:</p>
        <p className="text-6xl font-bold my-4 text-indigo-500">{total > 0 ? Math.round((score / total) * 100) : 100}%</p>
        <p className="text-lg">{score} correct out of {total}</p>
        <div className="flex gap-4 mt-8">
            <Button onClick={onRestart} size="lg"><SparklesIcon className="w-5 h-5 mr-2" />Try Again</Button>
            <Button onClick={onBack} variant="secondary" size="lg">Back to Cards</Button>
        </div>
    </div>
);


export const QuizScreen: React.FC = () => {
    const { currentDeckId, setScreen } = useAppStore();
    const [deck, setDeck] = useState<Deck | null>(null);
    const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    const currentQuizItem = useMemo(() => quizItems[currentIndex], [quizItems, currentIndex]);

    useEffect(() => {
        const loadQuiz = async () => {
            if (!currentDeckId) { setLoading(false); return; }
            setLoading(true);
            const [deckData, cardData] = await Promise.all([
                db.getDeckById(currentDeckId),
                db.getCardsByDeckId(currentDeckId)
            ]);
            setDeck(deckData || null);
            const items = generateQuizItemsFromCards(cardData);
            setQuizItems(shuffleArray(items));
            setLoading(false);
        };
        loadQuiz();
    }, [currentDeckId]);
    
    const handleBack = () => setScreen('cards', currentDeckId || undefined);

    const handleReveal = () => setShowAnswer(true);

    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) setScore(s => s + 1);
        
        if (currentIndex < quizItems.length - 1) {
            setCurrentIndex(i => i + 1);
            setShowAnswer(false);
        } else {
            setIsFinished(true);
        }
    };
    
    const handleRestart = () => {
        setQuizItems(shuffleArray(quizItems));
        setCurrentIndex(0);
        setScore(0);
        setShowAnswer(false);
        setIsFinished(false);
    };

    const renderCardContent = () => {
        if (!currentQuizItem) return null;
        const { item, type } = currentQuizItem;

        if (type === 'image') {
            return <ImageCardQuiz card={currentQuizItem.card as ImageCard} maskGroup={item as Mask[]} showAnswer={showAnswer} />;
        }
        
        const qa = item as TextQA;
        return (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center min-h-[200px] flex flex-col justify-center w-full max-w-2xl">
                <p className="text-gray-500 dark:text-gray-400 text-sm">QUESTION</p>
                <p className="text-2xl font-semibold my-2">{qa.question}</p>
                {showAnswer && (
                    <>
                        <hr className="my-4 border-gray-200 dark:border-gray-600"/>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">ANSWER</p>
                        <p className="text-xl mt-2">{qa.answer}</p>
                    </>
                )}
            </div>
        );
    };


    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="flex items-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4 !p-2"><ArrowLeftIcon className="w-6 h-6" /></Button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">Quiz: {deck?.name || '...'}</h1>
                {!isFinished && quizItems.length > 0 && <span className="ml-auto text-sm font-semibold text-gray-600 dark:text-gray-400">{currentIndex + 1} / {quizItems.length}</span>}
            </header>
            <main className="flex-1 flex flex-col p-4 md:p-8">
                {loading && <div className="m-auto"><LoadingSpinner /></div>}
                {!loading && (quizItems.length === 0 ? 
                    <div className="m-auto text-center"><p>No quiz items available in this deck!</p></div> : 
                    isFinished ? 
                    <QuizResultScreen score={score} total={quizItems.length} onRestart={handleRestart} onBack={handleBack} /> :
                    <div className="flex flex-col flex-1">
                        <div className="flex-1 flex items-center justify-center">{renderCardContent()}</div>
                        <div className="mt-8 flex justify-center gap-4">
                            {showAnswer ? (<>
                                <Button onClick={() => handleAnswer(false)} className="!bg-red-600 hover:!bg-red-700 w-32 h-16 text-lg"><XCircleIcon className="w-6 h-6 mr-2" />Incorrect</Button>
                                <Button onClick={() => handleAnswer(true)} className="!bg-green-600 hover:!bg-green-700 w-32 h-16 text-lg"><CheckCircleIcon className="w-6 h-6 mr-2" />Correct</Button>
                            </>) : (
                                <Button onClick={handleReveal} size="lg" className="px-12 py-4 text-xl">Show Answer</Button>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};