
export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface UserAssessment {
  experience: string;
  goals: string;
  preferredLanguage: string;
}

export interface RoadmapLevel {
  id: number;
  title: string;
  description: string;
  skillsGained: string[];
  status: 'locked' | 'unlocked' | 'completed';
  difficulty: Difficulty;
  concept: string; // The topic for generation
}

export type ChallengeType = 'create' | 'debug' | 'optimize' | 'mixed';

export interface TestCase {
  input: any[]; // Array of arguments passed to function
  expected: any; // Expected return value
}

export interface Question {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples: { input: string; output: string; explanation: string }[];
  constraints: string[];
  starterCode: string;
  hint: string;
  imageUrl?: string; // Concept Art
  diagramUrl?: string; // Technical Diagram (e.g., Linked List)
  challengeType: ChallengeType; // To track mode
  timeLimit: number; // In minutes. 0 means no limit.
  penaltyDrop: number; // Percentage points to drop
  penaltyInterval: number; // Seconds interval for penalty
  testCases?: TestCase[]; // Structured test cases for local runner
  dbId?: string; // Database ID mapped from Convex
  voiceUrl?: string; // Pre-generated UploadThing background voice URL
}

export interface CodeChange {
  originalSnippet: string;
  improvedSnippet: string;
  explanation: string;
}

export interface CodeReview {
  feedback: string;
  changes: CodeChange[];
  score: number;
  skillsLearned?: string[];
  keyTakeaway: string;
}