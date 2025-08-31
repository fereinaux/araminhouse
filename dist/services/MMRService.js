"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MMRService = void 0;
class MMRService {
    static calculateExpectedScore(team1Mmr, team2Mmr) {
        const mmrDifference = team1Mmr - team2Mmr;
        return 1 / (1 + Math.pow(10, mmrDifference / 400));
    }
    static calculateKFactor(player) {
        let kFactor = this.BASE_K_FACTOR;
        if (player.gamesPlayed < 30) {
            kFactor = this.MAX_K_FACTOR;
        }
        else if (player.gamesPlayed > 100) {
            kFactor = this.MIN_K_FACTOR;
        }
        if (player.mmr > 2000) {
            kFactor *= 0.8;
        }
        else if (player.mmr < 800) {
            kFactor *= 1.2;
        }
        return Math.max(this.MIN_K_FACTOR, Math.min(this.MAX_K_FACTOR, kFactor));
    }
    static calculateStreakBonus(player) {
        if (player.currentStreak >= this.STREAK_BONUS_THRESHOLD) {
            return Math.min(0.3, (player.currentStreak - this.STREAK_BONUS_THRESHOLD + 1) * 0.1);
        }
        return 0;
    }
    static calculatePerformanceBonus(matchPlayer) {
        let bonus = 0;
        if (matchPlayer.performance > 0.7) {
            bonus += 0.1;
        }
        else if (matchPlayer.performance < 0.3) {
            bonus -= 0.1;
        }
        return bonus;
    }
    static calculateMatchSizeMultiplier(teamSize) {
        return (this.MMR_MULTIPLIERS[teamSize] || 1.0);
    }
    static calculateTeamBalanceBonus(team1, team2) {
        const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
        const maxAllowedDifference = 200;
        if (mmrDifference > maxAllowedDifference) {
            return (-this.TEAM_BALANCE_PENALTY * (mmrDifference / maxAllowedDifference));
        }
        return 0.05;
    }
    static calculateMMRChange(player, playerTeam, opponentTeam, result, performance = 0.5) {
        const expectedScore = this.calculateExpectedScore(playerTeam.averageMmr, opponentTeam.averageMmr);
        const actualScore = result === "win" ? 1 : 0;
        const kFactor = this.calculateKFactor(player);
        const streakBonus = this.calculateStreakBonus(player);
        const performanceBonus = this.calculatePerformanceBonus({ performance });
        const teamBalanceBonus = this.calculateTeamBalanceBonus(playerTeam, opponentTeam);
        let mmrChange = kFactor * (actualScore - expectedScore);
        mmrChange *= 1 + streakBonus + performanceBonus + teamBalanceBonus;
        const maxChange = kFactor * 2;
        mmrChange = Math.max(-maxChange, Math.min(maxChange, mmrChange));
        const newMmr = Math.max(0, player.mmr + mmrChange);
        return {
            playerId: player.id,
            oldMmr: player.mmr,
            newMmr,
            change: mmrChange,
            expectedScore,
            actualScore,
            kFactor,
        };
    }
    static calculateMatchResults(team1, team2, winner, playerPerformances, teamSize = 5) {
        const results = [];
        const matchSizeMultiplier = this.calculateMatchSizeMultiplier(teamSize);
        team1.players.forEach((player) => {
            const performance = playerPerformances.get(player.id) || 0.5;
            const result = winner === "team1" ? "win" : "loss";
            const mmrCalc = this.calculateMMRChange(player, team1, team2, result, performance);
            mmrCalc.change *= matchSizeMultiplier;
            mmrCalc.newMmr = Math.max(0, player.mmr + mmrCalc.change);
            results.push(mmrCalc);
        });
        team2.players.forEach((player) => {
            const performance = playerPerformances.get(player.id) || 0.5;
            const result = winner === "team2" ? "win" : "loss";
            const mmrCalc = this.calculateMMRChange(player, team2, team1, result, performance);
            mmrCalc.change *= matchSizeMultiplier;
            mmrCalc.newMmr = Math.max(0, player.mmr + mmrCalc.change);
            results.push(mmrCalc);
        });
        return results;
    }
    static calculateInitialMMR() {
        return this.BASE_MMR;
    }
    static calculateInactivityPenalty(player, daysInactive) {
        if (daysInactive < 30)
            return 0;
        const penalty = Math.min(50, daysInactive * 0.5);
        return -penalty;
    }
    static calculatePercentile(player, allPlayers) {
        const sortedPlayers = [...allPlayers].sort((a, b) => b.mmr - a.mmr);
        const playerIndex = sortedPlayers.findIndex((p) => p.id === player.id);
        if (playerIndex === -1)
            return 0;
        return ((sortedPlayers.length - playerIndex) / sortedPlayers.length) * 100;
    }
    static calculateMMRConfidence(player) {
        if (player.gamesPlayed < 10)
            return 0.3;
        if (player.gamesPlayed < 30)
            return 0.6;
        if (player.gamesPlayed < 100)
            return 0.8;
        return 0.95;
    }
}
exports.MMRService = MMRService;
MMRService.BASE_MMR = 1000;
MMRService.BASE_K_FACTOR = 32;
MMRService.MAX_K_FACTOR = 40;
MMRService.MIN_K_FACTOR = 16;
MMRService.STREAK_BONUS_THRESHOLD = 3;
MMRService.STREAK_MULTIPLIER = 1.2;
MMRService.PERFORMANCE_MULTIPLIER = 0.1;
MMRService.TEAM_BALANCE_PENALTY = 0.05;
MMRService.MMR_MULTIPLIERS = {
    2: 0.3,
    3: 0.5,
    4: 0.7,
    5: 1.0,
};
//# sourceMappingURL=MMRService.js.map