
import React, { useState, useEffect, useRef } from 'react';
import { Question, UserAnswer, Language } from '../types';
import ProgressBar from './ProgressBar';
import { generatePronunciation } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import SpeakerIcon from './SpeakerIcon';
import PauseIcon from './PauseIcon';
import { playCorrectSound, playIncorrectSound } from '../utils/audioEffects';

// Audio helper functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const formatContextSentence = (sentence: string, word: string) => {
    if (!sentence || !word) return '';
    const regex = new RegExp(`(${word})`, 'gi');
    return sentence.replace(regex, `<strong class="text-cyan-300 font-semibold">$1</strong>`);
};

interface QuizScreenProps {
  questions: Question[];
  onFinish: (answers: UserAnswer[]) => void;
  language: Language;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ questions, onFinish, language }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [audioCache, setAudioCache] = useState<Record<number, AudioBuffer>>({});
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Initialize audio context and gain node on mount
  useEffect(() => {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = context;
      gainNodeRef.current = context.createGain();
      gainNodeRef.current.connect(context.destination);
      return () => {
          context.close();
      };
  }, []);

  const currentQuestion = questions[currentQuestionIndex];

  // Stop audio and reset state when question changes
  useEffect(() => {
    setIsAnimating(true);
    if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
    }
    setIsPlaying(false);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [currentQuestionIndex]);
  
  const playAudioFromBuffer = (buffer: AudioBuffer) => {
    const context = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    if (!context || !gainNode) return;

    if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.start();
    
    source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
    };
    sourceNodeRef.current = source;
  };

  const handlePlayPauseToggle = async () => {
    if (isAudioLoading || selectedOption) return;

    if (isPlaying) {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
        }
        return;
    }

    setIsPlaying(true);
    if (audioCache[currentQuestionIndex]) {
        playAudioFromBuffer(audioCache[currentQuestionIndex]);
        return;
    }

    setIsAudioLoading(true);
    try {
        const base64Audio = await generatePronunciation(currentQuestion.questionText);
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            audioContextRef.current!,
            24000,
            1,
        );
        setAudioCache(prev => ({ ...prev, [currentQuestionIndex]: audioBuffer }));
        playAudioFromBuffer(audioBuffer);
    } catch (error) {
        console.error('Failed to generate or play audio:', error);
        setIsPlaying(false);
    } finally {
        setIsAudioLoading(false);
    }
  };
  
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(event.target.value);
      setVolume(newVolume);
      if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = newVolume;
      }
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedOption) return;

    if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
    }
    setIsPlaying(false);
    setSelectedOption(answer);

    if (answer === currentQuestion.correctAnswer) {
      playCorrectSound(audioContextRef.current, gainNodeRef.current);
    } else {
      playIncorrectSound(audioContextRef.current, gainNodeRef.current);
    }

    const newAnswers = [...userAnswers, { questionIndex: currentQuestionIndex, answer }];
    setUserAnswers(newAnswers);

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setSelectedOption(null);
      } else {
        onFinish(newAnswers);
      }
    }, 800);
  };
  
  const getButtonClass = (option: string) => {
    if (!selectedOption) {
      return 'bg-slate-800 hover:bg-slate-700';
    }
    if (option === currentQuestion.correctAnswer) {
      return 'bg-green-500/80';
    }
    if (option === selectedOption && option !== currentQuestion.correctAnswer) {
      return 'bg-red-500/80';
    }
    return 'bg-slate-800 opacity-60';
  };

  const getLevelPrefix = () => {
    switch(language) {
      case 'hsk': return 'HSK Level';
      case 'ielts': return 'IELTS Band';
      case 'dele': return 'DELE Level';
      default: return 'Level';
    }
  }

  return (
    <div className="w-full max-w-2xl p-4 md:p-8">
      <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
      
      <div className={`transition-all duration-300 ease-in-out ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="text-center mb-8">
          <p className="text-slate-400 text-lg mb-2">
            What is the meaning of:
          </p>
          <h2 className="text-5xl md:text-6xl font-bold text-cyan-300">{currentQuestion.questionText}</h2>
          
          {currentQuestion.contextSentence && (
            <p 
              className="text-slate-300 text-xl mt-4 max-w-prose mx-auto" 
              dangerouslySetInnerHTML={{ __html: formatContextSentence(currentQuestion.contextSentence, currentQuestion.questionText) }} 
            />
          )}

          {language === 'hsk' && (
            <div className="mt-4 flex items-center justify-center gap-3 bg-slate-800/50 rounded-full py-1.5 px-3 max-w-[200px] mx-auto">
                <button
                    onClick={handlePlayPauseToggle}
                    disabled={isAudioLoading || !!selectedOption}
                    className="flex-shrink-0 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-full p-1"
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                    {isAudioLoading 
                        ? <LoadingSpinner size="h-6 w-6" /> 
                        : (isPlaying 
                            ? <PauseIcon className="h-6 w-6 text-cyan-400" /> 
                            : <SpeakerIcon className="h-6 w-6 hover:text-cyan-400 transition-colors" />
                          )
                    }
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    disabled={!!selectedOption}
                    className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Volume control"
                />
            </div>
          )}

          <p className="text-slate-500 mt-4">({getLevelPrefix()} {currentQuestion.level})</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(option)}
              disabled={!!selectedOption}
              className={`p-4 rounded-lg text-lg text-left transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-cyan-500/50 disabled:cursor-not-allowed ${getButtonClass(option)} ${!selectedOption ? 'hover:scale-105' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
