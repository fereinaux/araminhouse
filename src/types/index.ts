export interface Player {
  id: string;
  username: string;
  discordId: string;
  mmr: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  createdAt: Date;
  lastGameAt?: Date;
  currentStreak: number;
  bestStreak: number;
  averageKDA?: number;
  preferredRoles: string[];
}

export interface Queue {
  id: number;
  size: number;
  status: QueueStatus;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  players: Player[];
}

export interface Match {
  id: number;
  queueId: number;
  winnerTeam: string;
  winner?: "team1" | "team2";
  createdAt: Date;
  endedAt?: Date;
  finishedAt?: Date;
  duration?: number;
  players: MatchPlayer[];
  team1Players?: MatchPlayer[];
  team2Players?: MatchPlayer[];
  teamSize?: number;
  team1Score?: number;
  team2Score?: number;
}

export interface MatchPlayer {
  matchId: number;
  playerId: string;
  team: string;
  result: "win" | "loss";
  role: string;
  performance: number;
  mmrChange: number;
}

export interface Team {
  id: string;
  players: Player[];
  averageMmr: number;
  totalMmr: number;
}

export interface MMRCalculation {
  playerId: string;
  oldMmr: number;
  newMmr: number;
  change: number;
  expectedScore: number;
  actualScore: number;
  kFactor: number;
}

export interface Role {
  name: string;
  priority: number;
  required: boolean;
}

export interface QueueConfig {
  minPlayers: number;
  maxPlayers: number;
  teamSize: number;
  maxMmrDifference: number;
  roleDistribution: Role[];
}

export type QueueStatus =
  | "waiting"
  | "forming"
  | "ready"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface DiscordConfig {
  token: string;
  clientId: string;
  guildId: string;
}

export interface DatabaseConfig {
  path: string;
  verbose: boolean;
}

export interface AppConfig {
  port: number;
  discord: DiscordConfig;
  database: DatabaseConfig;
  queue: QueueConfig;
}
