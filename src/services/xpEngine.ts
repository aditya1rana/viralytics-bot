/**
 * XP Engine — handles level calculation, XP rewards, and level-up detection.
 */

// XP required for each level: level * 100 + 50
export function xpForLevel(level: number): number {
  return level * 100 + 50;
}

// Total XP required to reach a given level from 0
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

// Calculate level from total XP
export function calculateLevel(totalXp: number): number {
  let level = 0;
  let xpNeeded = 0;
  while (true) {
    const nextLevel = xpForLevel(level + 1);
    if (xpNeeded + nextLevel > totalXp) break;
    xpNeeded += nextLevel;
    level++;
  }
  return level;
}

// XP remaining until next level
export function xpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const xpForCurrent = totalXpForLevel(currentLevel);
  const xpForNext = xpForLevel(currentLevel + 1);
  return xpForNext - (totalXp - xpForCurrent);
}

// Check if adding XP would cause a level up
export function wouldLevelUp(currentXp: number, addedXp: number): boolean {
  return calculateLevel(currentXp + addedXp) > calculateLevel(currentXp);
}

// Get the new level after adding XP
export function getNewLevel(currentXp: number, addedXp: number): number {
  return calculateLevel(currentXp + addedXp);
}

// XP reward values
export const XP_REWARDS = {
  MESSAGE: 15,
  SUBMISSION: 50,
  APPROVED_SUBMISSION: 100,
  VERIFICATION: 25,
  INVITE: 30,
  HELPING: 20,
  EVENT_WIN: 200,
} as const;
