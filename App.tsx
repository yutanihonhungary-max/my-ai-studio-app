import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { LoginScreen } from './screens/LoginScreen';
import { DecksScreen } from './screens/DecksScreen';
import { CardsScreen } from './screens/CardsScreen';
import { CardEditScreen } from './screens/CardEditScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ToastContainer } from './components/Toast';

const ScreenRouter: React.FC = () => {
    const screen = useAppStore((state) => state.screen);

    switch (screen) {
        case 'login':
            return <LoginScreen />;
        case 'decks':
            return <DecksScreen />;
        case 'cards':
            return <CardsScreen />;
        case 'editCard':
            return <CardEditScreen />;
        case 'quiz':
            return <QuizScreen />;
        default:
            return <DecksScreen />;
    }
};

const App: React.FC = () => {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'space');
    root.classList.add(theme);
    if(theme === 'dark'){
        root.style.colorScheme = 'dark';
    } else {
        root.style.colorScheme = 'light';
    }
  }, [theme]);

  return (
    <div className="w-screen h-screen bg-gray-50 dark:bg-gray-900">
      <ScreenRouter />
      <ToastContainer />
    </div>
  );
};

export default App;