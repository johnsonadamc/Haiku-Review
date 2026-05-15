import { syllable } from 'syllable';

export function countLineSyllables(line: string): number {
  const trimmed = line.trim();
  if (!trimmed) return 0;
  return syllable(trimmed);
}
