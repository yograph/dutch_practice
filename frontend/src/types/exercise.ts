/**
 * Exercise sets: grammar questions, translations and writing prompts. See
 * `docs/DATA_CONTRACT.md` — like decks, a set is metadata in the manifest plus
 * items from its own authored file (`exercises/<id>.json`), and `ExerciseSet`
 * is what the data layer assembles from the two.
 *
 * Unlike a word's id, an exercise's id is not derived from its text: exercises
 * get reworded in place, so the id is simply a stable slug chosen at authoring
 * time. It is still the key progress is stored under and must never be
 * reassigned.
 */

export type ExerciseKind = "grammar" | "translation" | "writing";

/** A multiple-choice grammar question. Exactly one choice is correct. */
export interface GrammarExercise {
  id: string;
  /** The question or a fill-in-the-blank sentence, with `___` for the gap. */
  prompt: string;
  choices: string[];
  /** 0-based index into `choices`. */
  answerIndex: number;
  explanation: string;
  tags: string[];
}

/** A sentence to translate; the learner self-checks against `reference`. */
export interface TranslationExercise {
  id: string;
  source: string;
  reference: string;
  /** `nl-en` when `source` is Dutch, `en-nl` when it is English. */
  direction: "nl-en" | "en-nl";
  tags: string[];
}

/** A free-writing prompt; the learner self-checks against `example`. */
export interface WritingExercise {
  id: string;
  prompt: string;
  instructions: string;
  /** A model answer in Dutch. May contain newlines between sentences. */
  example: string;
  tags: string[];
}

/** Manifest entry for a set: everything the overview needs before loading it. */
export interface ExerciseSetSummary {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Optional CEFR-ish label ("A1"), shown as a subtitle. */
  level?: string;
  color: string;
  /** Content hash of the set file (12 hex chars). Doubles as the cache key. */
  revision: string;
  exerciseCount: number;
  icon?: string;
}

interface ExerciseSetBase {
  schemaVersion: number;
  id: string;
  name: string;
  level?: string;
  color: string;
  revision: string;
}

export interface GrammarSet extends ExerciseSetBase {
  kind: "grammar";
  exercises: GrammarExercise[];
}

export interface TranslationSet extends ExerciseSetBase {
  kind: "translation";
  exercises: TranslationExercise[];
}

export interface WritingSet extends ExerciseSetBase {
  kind: "writing";
  exercises: WritingExercise[];
}

/**
 * A fully loaded set. Discriminated on `kind`, so narrowing the set also
 * narrows its `exercises` — the practice UI never has to cast an item.
 */
export type ExerciseSet = GrammarSet | TranslationSet | WritingSet;
