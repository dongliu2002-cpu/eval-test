
import React, { useState, useCallback } from 'react';
import { QuizState, Question, UserAnswer, Language } from './types';
import { generateQuizQuestions } from './services/geminiService';
import WelcomeScreen from './components/WelcomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [quizState, setQuizState] = useState<QuizState>(QuizState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language | null>(null);

  const handleStart = useCallback(async (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    setQuizState(QuizState.LOADING);
    setError(null);
    try {
      const newQuestions = await generateQuizQuestions(selectedLanguage);
      if (newQuestions.length === 0) {
        throw new Error("Failed to generate questions. The AI returned an empty list.");
      }
      setQuestions(newQuestions);
      setUserAnswers([]);
      setQuizState(QuizState.QUIZ);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while generating questions.";
      setError(errorMessage);
      setQuizState(QuizState.WELCOME);
    }
  }, []);

  const handleFinish = useCallback((answers: UserAnswer[]) => {
    setUserAnswers(answers);
    setQuizState(QuizState.RESULTS);
  }, []);

  const handleRestart = useCallback(() => {
    setQuestions([]);
    setUserAnswers([]);
    setLanguage(null);
    setQuizState(QuizState.WELCOME);
    setError(null);
  }, []);

  const renderContent = () => {
    switch (quizState) {
      case QuizState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-gray-200 animate-pulse">Generating your personalized test...</p>
          </div>
        );
      case QuizState.QUIZ:
        if (!language) {
          handleRestart();
          return null;
        }
        return <QuizScreen questions={questions} onFinish={handleFinish} language={language} />;
      case QuizState.RESULTS:
        if (!language) {
          handleRestart();
          return null;
        }
        return <ResultsScreen questions={questions} userAnswers={userAnswers} onRestart={handleRestart} language={language} />;
      case QuizState.WELCOME:
      default:
        return <WelcomeScreen onStart={handleStart} error={error} />;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4 selection:bg-cyan-300 selection:text-cyan-900">
      <div className="w-full max-w-2xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
