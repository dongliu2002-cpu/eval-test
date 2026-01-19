
import React, { useMemo } from 'react';
import { Question, UserAnswer, Language } from '../types';

interface ResultsScreenProps {
  questions: Question[];
  userAnswers: UserAnswer[];
  onRestart: () => void;
  language: Language;
}

const VOCAB_ESTIMATES: Record<Language, Record<string, number>> = {
  hsk: { '1': 150, '2': 300, '3': 600, '4': 1200, '5': 2500, '6': 5000 },
  dele: { 'A1': 500, 'A2': 1000, 'B1': 2000, 'B2': 4000, 'C1': 8000, 'C2': 16000 },
  ielts: { '4': 2000, '4.5': 2500, '5': 3000, '5.5': 4000, '6': 5000, '6.5': 6500, '7': 8000, '7.5': 12000, '8': 16000, '8.5': 16000, '9': 16000 }
};

const LEVEL_ORDER: Record<Language, (string | number)[]> = {
    hsk: [1, 2, 3, 4, 5, 6],
    ielts: [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9],
    dele: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ questions, userAnswers, onRestart, language }) => {
  const { correctAnswers, score, estimatedLevel, estimatedVocab, levelPrefix } = useMemo(() => {
    const correctAnswersCount = userAnswers.filter(ua => questions[ua.questionIndex].correctAnswer === ua.answer).length;
    const calculatedScore = Math.round((correctAnswersCount / questions.length) * 100);

    const correctByLevel: { [key: string]: number } = {};
    const totalByLevel: { [key: string]: number } = {};

    questions.forEach((q) => {
      const levelStr = String(q.level);
      totalByLevel[levelStr] = (totalByLevel[levelStr] || 0) + 1;
    });

    userAnswers.forEach((ua) => {
        const question = questions[ua.questionIndex];
        if (question.correctAnswer === ua.answer) {
            const levelStr = String(question.level);
            correctByLevel[levelStr] = (correctByLevel[levelStr] || 0) + 1;
        }
    });
    
    let finalLevel: string | number = '';
    let calculatedPrefix = '';
    let finalLevelKey: string | number | null = null;
    
    const order = LEVEL_ORDER[language];
    let passedLevel: string | number | null = null;
    for (const level of order) {
        const levelStr = String(level);
        const accuracy = totalByLevel[levelStr] > 0 ? (correctByLevel[levelStr] || 0) / totalByLevel[levelStr] : 0;
        if (accuracy >= 0.6) {
            passedLevel = level;
        } else {
            break; 
        }
    }
    
    switch (language) {
      case 'hsk':
        calculatedPrefix = 'HSK Level';
        finalLevel = passedLevel ? `${passedLevel}` : (calculatedScore > 20 ? '1' : 'Below 1');
        finalLevelKey = passedLevel ? String(passedLevel) : (calculatedScore > 20 ? '1' : null);
        break;
      case 'ielts':
        calculatedPrefix = 'IELTS Band';
        finalLevel = passedLevel ? `${passedLevel}` : (calculatedScore > 20 ? '4.0' : 'Below 4.0');
        finalLevelKey = passedLevel ? String(passedLevel) : (calculatedScore > 20 ? '4' : null);
        break;
      case 'dele':
        calculatedPrefix = 'DELE Level';
        finalLevel = passedLevel ? `${passedLevel}` : (calculatedScore > 20 ? 'A1' : 'Below A1');
        finalLevelKey = passedLevel ? String(passedLevel) : (calculatedScore > 20 ? 'A1' : null);
        break;
    }

    let calculatedVocab = '~100-200 words';
    if(finalLevelKey) {
        const vocabMap = VOCAB_ESTIMATES[language];
        if(vocabMap[String(finalLevelKey)]) {
            calculatedVocab = `~${vocabMap[String(finalLevelKey)].toLocaleString()} words`;
        }
    }

    return { 
        correctAnswers: correctAnswersCount, 
        score: calculatedScore, 
        estimatedLevel: finalLevel, 
        estimatedVocab: calculatedVocab, 
        levelPrefix: calculatedPrefix 
    };
  }, [questions, userAnswers, language]);

  return (
    <div className="text-center bg-slate-800 p-8 rounded-2xl shadow-2xl animate-fade-in">
      <h2 className="text-3xl font-bold text-white mb-2">Test Complete!</h2>
      <p className="text-slate-300 mb-6">Here's your performance summary.</p>

      <div className="bg-slate-900 rounded-xl p-6 my-8">
        <p className="text-slate-400 text-lg">Your Estimated Level</p>
        <p className="text-5xl font-bold text-cyan-300 my-2">
          {levelPrefix} {estimatedLevel}
        </p>
        <p className="text-2xl font-semibold text-amber-300 mt-4">{estimatedVocab}</p>
        
        <div className="flex justify-center items-baseline space-x-2 mt-6">
          <p className="text-3xl font-semibold text-white">{correctAnswers}</p>
          <p className="text-slate-400 text-lg">/ {questions.length} correct</p>
        </div>
        <p className="text-2xl text-white mt-1">({score}%)</p>
      </div>
      
      <button
        onClick={onRestart}
        className="bg-cyan-500 text-slate-900 font-bold py-3 px-10 rounded-full text-lg hover:bg-cyan-400 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-cyan-300/50"
      >
        Try Another Test
      </button>
    </div>
  );
};

export default ResultsScreen;
