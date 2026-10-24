import type { DailyGoal, LevelSummary } from "@/types/student-state";

export const XP_REWARDS = {
  firstAttempt: 5,
  firstCorrect: 10,
  firstDebugCorrect: 5,
} as const;

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
] as const;

export const DAILY_GOALS: DailyGoal[] = [5, 10, 15];
export const DEFAULT_DAILY_GOAL: DailyGoal = 10;

export const ACHIEVEMENT_CATEGORIES = [
  "Início",
  "Estudos",
  "Precisão",
  "Debug Mode",
  "Daily Commit",
  "Exploração",
  "Evolução",
] as const;

export const ACHIEVEMENTS = [
  {
    id: "first-step",
    name: "Primeiro Passo",
    description: "Registre sua primeira tentativa.",
    category: "Início",
    icon: "footprints",
  },
  {
    id: "first-correct",
    name: "Primeiro Acerto",
    description: "Acerte uma questão pela primeira vez.",
    category: "Início",
    icon: "circle-check",
  },
  {
    id: "warm-up",
    name: "Aquecimento",
    description: "Responda 5 questões únicas.",
    category: "Início",
    icon: "flame",
  },
  {
    id: "ten-questions",
    name: "Entrando no Ritmo",
    description: "Responda 10 questões únicas.",
    category: "Início",
    icon: "activity",
  },
  {
    id: "focus-total",
    name: "Foco Total",
    description: "Responda 25 questões únicas.",
    category: "Estudos",
    icon: "target",
  },
  {
    id: "marathoner",
    name: "Maratonista",
    description: "Responda 50 questões únicas.",
    category: "Estudos",
    icon: "medal",
  },
  {
    id: "study-machine",
    name: "Máquina de Estudos",
    description: "Responda 100 questões únicas.",
    category: "Estudos",
    icon: "cpu",
  },
  {
    id: "tireless",
    name: "Incansável",
    description: "Responda 250 questões únicas.",
    category: "Estudos",
    icon: "infinity",
  },
  {
    id: "sharp-mind",
    name: "Mente Afiada",
    description: "Acerte 10 questões únicas.",
    category: "Precisão",
    icon: "brain",
  },
  {
    id: "specialist",
    name: "Especialista",
    description: "Acerte 25 questões únicas.",
    category: "Precisão",
    icon: "book-check",
  },
  {
    id: "master-of-knowledge",
    name: "Mestre do Conhecimento",
    description: "Acerte 50 questões únicas.",
    category: "Precisão",
    icon: "trophy",
  },
  {
    id: "reviewer",
    name: "Primeiro Debug",
    description: "Corrija uma questão que estava pendente.",
    category: "Debug Mode",
    icon: "bug",
  },
  {
    id: "bug-hunter",
    name: "Caçador de Bugs",
    description: "Corrija 5 questões que estavam pendentes.",
    category: "Debug Mode",
    icon: "bug-play",
  },
  {
    id: "experienced-debugger",
    name: "Debugger Experiente",
    description: "Corrija 20 questões que estavam pendentes.",
    category: "Debug Mode",
    icon: "code",
  },
  {
    id: "clean-code",
    name: "Código Limpo",
    description: "Zere a fila de revisão após acumular pelo menos 5 pendências.",
    category: "Debug Mode",
    icon: "list-checks",
  },
  {
    id: "first-commit",
    name: "Primeiro Commit",
    description: "Conclua sua primeira meta diária.",
    category: "Daily Commit",
    icon: "git-commit",
  },
  {
    id: "commit-triple",
    name: "Commit Triplo",
    description: "Conclua a meta por 3 dias consecutivos.",
    category: "Daily Commit",
    icon: "git-branch",
  },
  {
    id: "study-week",
    name: "Semana de Estudos",
    description: "Cumpra sua meta diária por sete dias consecutivos.",
    category: "Daily Commit",
    icon: "calendar-days",
  },
  {
    id: "stable-branch",
    name: "Branch Estável",
    description: "Conclua a meta por 14 dias consecutivos.",
    category: "Daily Commit",
    icon: "shield-check",
  },
  {
    id: "continuous-deploy",
    name: "Deploy Contínuo",
    description: "Conclua a meta por 30 dias consecutivos.",
    category: "Daily Commit",
    icon: "rocket",
  },
  {
    id: "explorer",
    name: "Explorador",
    description: "Responda uma questão de cada uma das quatro áreas do ENEM.",
    category: "Exploração",
    icon: "compass",
  },
  {
    id: "full-stack",
    name: "Full Stack",
    description: "Acerte 5 questões únicas de cada uma das quatro áreas.",
    category: "Exploração",
    icon: "layers",
  },
  {
    id: "first-upgrade",
    name: "Primeiro Upgrade",
    description: "Alcance o nível 2.",
    category: "Evolução",
    icon: "star",
  },
  {
    id: "optimized-build",
    name: "Build Otimizada",
    description: "Alcance o nível 5.",
    category: "Evolução",
    icon: "zap",
  },
  {
    id: "version-10",
    name: "Versão 10.0",
    description: "Alcance o nível 10.",
    category: "Evolução",
    icon: "crown",
  },
] as const;

export const LEGACY_ACHIEVEMENTS = [
  {
    id: "persistence",
    name: "Persistência",
    description: "Conclua corretamente cinco questões únicas.",
  },
] as const;

export function getLevelSummary(totalXp: number): LevelSummary {
  const thresholds: number[] = [...LEVEL_THRESHOLDS];
  while (totalXp >= thresholds[thresholds.length - 1]) {
    const previousGap =
      thresholds[thresholds.length - 1] -
      thresholds[thresholds.length - 2];
    thresholds.push(thresholds[thresholds.length - 1] + previousGap + 50);
  }

  let levelIndex = 0;
  while (
    levelIndex + 1 < thresholds.length &&
    totalXp >= thresholds[levelIndex + 1]
  ) {
    levelIndex += 1;
  }

  const levelXp = thresholds[levelIndex];
  const nextLevelXp = thresholds[levelIndex + 1] ?? null;
  const currentLevelXp = totalXp - levelXp;
  const levelSpan = nextLevelXp === null ? 0 : nextLevelXp - levelXp;

  return {
    level: levelIndex + 1,
    currentLevelXp,
    nextLevelXp,
    xpToNextLevel: nextLevelXp === null ? 0 : nextLevelXp - totalXp,
    progressPercentage:
      levelSpan === 0
        ? 100
        : Math.min(100, Math.floor((currentLevelXp / levelSpan) * 100)),
  };
}
