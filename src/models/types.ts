/** LMSPK's question model, stripped of database and progress bookkeeping. */
export const QUESTION_TYPES = ['multiple_choice', 'multiple_select', 'true_false', 'flashcard'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
interface QuestionBase {
  id: string;
  prompt: string;
  explanation?: string;
  difficulty?: Difficulty;
  tags: string[];
}
export interface MultipleChoiceContent extends QuestionBase {
  type: 'multiple_choice';
  choices: string[];
  correctIndex: number;
}
export interface MultipleSelectContent extends QuestionBase {
  type: 'multiple_select';
  choices: string[];
  correctIndices: number[];
}
export interface TrueFalseContent extends QuestionBase {
  type: 'true_false';
  answer: boolean;
}
export interface FlashcardContent extends QuestionBase {
  type: 'flashcard';
  answer: string;
  image?: { src: string; alt: string };
  backImage?: { src: string; alt: string };
}
export type Question = MultipleChoiceContent | MultipleSelectContent | TrueFalseContent | FlashcardContent;
export interface Collection {
  subjectId: string;
  chapterId?: string;
  id: string;
  name: string;
  category: string;
  subject: string;
  count: number;
  color: 'blue' | 'green' | 'purple' | 'amber';
}
export type ResourceSection = 'flashcards' | 'documents' | 'tests';
export interface Chapter {
  id: string;
  name: string;
}
export interface Subject {
  semester: number;
  courseId?: string;
  id: string;
  name: string;
  category: string;
  color: Collection['color'];
  icon: 'database' | 'code' | 'globe' | 'flask' | 'leaf' | 'languages' | 'book';
  chapters: Chapter[];
}
export interface SubjectContent {
  subject: Subject;
  flashcards: Collection[];
  documents: LearningDocument[];
  tests: Collection[];
}
export interface Syllabus {
  subjectId: string;
  syllabusId: string;
  syllabusName: string;
  courseName: string;
  courseNameEnglish: string;
  subjectCode: string;
  teachingLearningMethod: string;
  noCredit: string;
  degree: string;
  timeAllocation: string;
  prerequisite: string;
  description: string;
  studentTasks: string;
  tools: string;
  scoringScale: string;
  decisionNo: string;
  approvedDate: string;
}
export interface ResourceContext {
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
}
export interface Deck {
  name: string;
  questions: Question[];
}
export type DocumentFormat = 'pdf' | 'docx' | 'md' | 'txt';
export interface LearningDocument extends Omit<Collection, 'count'> {
  file: string;
  format: DocumentFormat;
}
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Một đáp án',
  multiple_select: 'Nhiều đáp án',
  true_false: 'Đúng / Sai',
  flashcard: 'Thẻ ghi nhớ',
};
