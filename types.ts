
export enum QuizState {
  WELCOME,
  LOADING,
  QUIZ,
  RESULTS
}

export type Language = 'hsk' | 'ielts' | 'dele';

export interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
  level: number | string;
  contextSentence?: string;
}

export interface UserAnswer {
  questionIndex: number;
  answer: string;
}
