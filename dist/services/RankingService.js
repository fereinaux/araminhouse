"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingService = void 0;
class RankingService {
    static calculateLoLRanking(mmr, totalPlayers) {
        let tier = "Iron";
        let division = "IV";
        let lp = 0;
        for (let i = this.TIERS.length - 1; i >= 0; i--) {
            const currentTier = this.TIERS[i];
            const baseMmr = this.TIER_MMR_BASES[currentTier];
            if (mmr >= baseMmr) {
                tier = currentTier;
                break;
            }
        }
        const baseMmr = this.TIER_MMR_BASES[tier];
        const mmrAboveBase = mmr - baseMmr;
        if (tier === "Challenger") {
            division = "";
            lp = mmrAboveBase;
        }
        else if (tier === "Master" || tier === "Grandmaster") {
            division = "";
            lp = mmrAboveBase;
        }
        else {
            const totalDivisions = this.DIVISIONS.length;
            const mmrPerDivision = (this.TIER_MMR_BASES[this.getNextTier(tier)] -
                baseMmr) /
                totalDivisions;
            const divisionIndex = Math.floor(mmrAboveBase / mmrPerDivision);
            division = this.DIVISIONS[Math.min(divisionIndex, totalDivisions - 1)];
            const mmrInDivision = mmrAboveBase % mmrPerDivision;
            lp = Math.floor((mmrInDivision / mmrPerDivision) * this.LP_PER_DIVISION);
        }
        const rank = this.calculateRank(mmr, totalPlayers);
        const nextRank = this.getNextRank(tier, division);
        const nextRankLP = this.calculateNextRankLP(tier, division, mmr);
        return {
            tier,
            division,
            lp,
            rank,
            totalPlayers,
            nextRank,
            nextRankLP,
        };
    }
    static getNextTier(currentTier) {
        const currentIndex = this.TIERS.indexOf(currentTier);
        if (currentIndex < this.TIERS.length - 1) {
            return this.TIERS[currentIndex + 1];
        }
        return currentTier;
    }
    static getNextRank(tier, division) {
        if (tier === "Challenger") {
            return "Challenger (manter posição)";
        }
        if (tier === "Grandmaster") {
            return "Challenger";
        }
        if (tier === "Master") {
            return "Grandmaster";
        }
        const divisionIndex = this.DIVISIONS.indexOf(division);
        if (divisionIndex > 0) {
            return `${tier} ${this.DIVISIONS[divisionIndex - 1]}`;
        }
        else {
            return this.getNextTier(tier);
        }
    }
    static calculateNextRankLP(tier, division, currentMmr) {
        if (tier === "Challenger") {
            return 0;
        }
        const baseMmr = this.TIER_MMR_BASES[tier];
        const mmrAboveBase = currentMmr - baseMmr;
        if (tier === "Master" || tier === "Grandmaster") {
            const nextTier = this.getNextTier(tier);
            const nextTierMmr = this.TIER_MMR_BASES[nextTier];
            return nextTierMmr - currentMmr;
        }
        const divisionIndex = this.DIVISIONS.indexOf(division);
        if (divisionIndex > 0) {
            const mmrPerDivision = (this.TIER_MMR_BASES[this.getNextTier(tier)] -
                baseMmr) /
                this.DIVISIONS.length;
            const nextDivisionMmr = baseMmr + mmrPerDivision * (divisionIndex - 1);
            return nextDivisionMmr - currentMmr;
        }
        else {
            const nextTier = this.getNextTier(tier);
            const nextTierMmr = this.TIER_MMR_BASES[nextTier];
            return nextTierMmr - currentMmr;
        }
    }
    static calculateRank(mmr, totalPlayers) {
        return Math.max(1, Math.floor(totalPlayers - mmr / 100 + 1));
    }
    static getTierEmoji(tier) {
        const emojis = {
            Iron: "🥉",
            Bronze: "🥉",
            Silver: "🥈",
            Gold: "🥇",
            Platinum: "💎",
            Diamond: "💎",
            Master: "👑",
            Grandmaster: "👑",
            Challenger: "👑",
        };
        return emojis[tier] || "🏆";
    }
    static getTierColor(tier) {
        const colors = {
            Iron: "#8B4513",
            Bronze: "#CD7F32",
            Silver: "#C0C0C0",
            Gold: "#FFD700",
            Platinum: "#E5E4E2",
            Diamond: "#B9F2FF",
            Master: "#FF6B6B",
            Grandmaster: "#FF8C00",
            Challenger: "#FF1493",
        };
        return colors[tier] || "#00FF00";
    }
    static formatRanking(tier, division, lp) {
        if (tier === "Challenger" || tier === "Master" || tier === "Grandmaster") {
            return `${this.getTierEmoji(tier)} **${tier}** (${lp} LP)`;
        }
        return `${this.getTierEmoji(tier)} **${tier} ${division}** (${lp} LP)`;
    }
    static getProgressToNextRank(lp) {
        const percentage = Math.floor((lp / this.LP_PER_DIVISION) * 100);
        return `${percentage}%`;
    }
}
exports.RankingService = RankingService;
RankingService.TIERS = [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
];
RankingService.DIVISIONS = ["IV", "III", "II", "I"];
RankingService.LP_PER_DIVISION = 100;
RankingService.TIER_MMR_BASES = {
    Iron: 0,
    Bronze: 400,
    Silver: 800,
    Gold: 1200,
    Platinum: 1600,
    Diamond: 2000,
    Master: 2400,
    Grandmaster: 2800,
    Challenger: 3200,
};
//# sourceMappingURL=RankingService.js.map