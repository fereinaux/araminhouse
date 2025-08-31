"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamBalancerService = void 0;
class TeamBalancerService {
    static balanceTeams(players, teamSize) {
        if (!teamSize) {
            teamSize = Math.floor(players.length / 2);
        }
        if (players.length < teamSize * 2) {
            throw new Error("Número insuficiente de jogadores para formar times");
        }
        const sortedPlayers = [...players].sort((a, b) => b.mmr - a.mmr);
        const team1 = {
            id: "team1",
            players: [],
            averageMmr: 0,
            totalMmr: 0,
        };
        const team2 = {
            id: "team2",
            players: [],
            averageMmr: 0,
            totalMmr: 0,
        };
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            if (!player)
                continue;
            if (i % 2 === 0) {
                team1.players.push(player);
                this.updateTeamStats(team1);
            }
            else {
                team2.players.push(player);
                this.updateTeamStats(team2);
            }
        }
        this.optimizeTeamBalance(team1, team2);
        return [team1, team2];
    }
    static updateTeamStats(team) {
        if (team.players.length === 0) {
            team.totalMmr = 0;
            team.averageMmr = 0;
            return;
        }
        team.totalMmr = team.players.reduce((sum, player) => sum + player.mmr, 0);
        team.averageMmr = team.totalMmr / team.players.length;
    }
    static optimizeTeamBalance(team1, team2) {
        let bestBalance = this.calculateBalanceScore(team1, team2);
        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < team1.players.length; i++) {
                for (let j = 0; j < team2.players.length; j++) {
                    const tempPlayer1 = team1.players[i];
                    const tempPlayer2 = team2.players[j];
                    if (!tempPlayer1 || !tempPlayer2)
                        continue;
                    team1.players[i] = tempPlayer2;
                    team2.players[j] = tempPlayer1;
                    this.updateTeamStats(team1);
                    this.updateTeamStats(team2);
                    const newBalance = this.calculateBalanceScore(team1, team2);
                    if (newBalance > bestBalance) {
                        bestBalance = newBalance;
                        improved = true;
                    }
                    else {
                        team1.players[i] = tempPlayer1;
                        team2.players[j] = tempPlayer2;
                        this.updateTeamStats(team1);
                        this.updateTeamStats(team2);
                    }
                }
            }
        }
    }
    static calculateBalanceScore(team1, team2) {
        const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
        const roleBalance = this.calculateRoleBalance(team1, team2);
        const mmrScore = Math.max(0, 1 - mmrDifference / this.MAX_MMR_DIFFERENCE);
        return mmrScore * this.MMR_WEIGHT + roleBalance * this.ROLE_PRIORITY_WEIGHT;
    }
    static calculateRoleBalance(team1, team2) {
        const roles1 = this.getRoleDistribution(team1);
        const roles2 = this.getRoleDistribution(team2);
        let totalDifference = 0;
        const allRoles = new Set([...Object.keys(roles1), ...Object.keys(roles2)]);
        for (const role of allRoles) {
            const count1 = roles1[role] || 0;
            const count2 = roles2[role] || 0;
            const difference = Math.abs(count1 - count2);
            totalDifference += difference;
        }
        const maxDifference = allRoles.size * 5;
        return Math.max(0, 1 - totalDifference / maxDifference);
    }
    static getRoleDistribution(team) {
        const roles = {};
        team.players.forEach((player) => {
            player.preferredRoles.forEach((role) => {
                roles[role] = (roles[role] || 0) + 1;
            });
        });
        return roles;
    }
    static areTeamsBalanced(team1, team2) {
        const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
        return mmrDifference <= this.MAX_MMR_DIFFERENCE;
    }
    static getBalanceStats(team1, team2) {
        const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
        const balanceScore = this.calculateBalanceScore(team1, team2);
        const isBalanced = this.areTeamsBalanced(team1, team2);
        const recommendations = [];
        if (mmrDifference > this.IDEAL_MMR_DIFFERENCE) {
            recommendations.push("Considerar redistribuir jogadores para reduzir diferença de MMR");
        }
        if (balanceScore < 0.7) {
            recommendations.push("Verificar distribuição de roles entre os times");
        }
        return {
            mmrDifference,
            balanceScore,
            isBalanced,
            recommendations,
        };
    }
    static balanceTeamsWithRoles(players, teamSize = 5, requiredRoles = []) {
        const teams = this.distributeRequiredRoles(players, teamSize, requiredRoles);
        const remainingPlayers = players.filter((p) => !teams.some((team) => team.players.includes(p)));
        this.distributeRemainingPlayers(teams, remainingPlayers);
        if (teams[0] && teams[1]) {
            this.optimizeTeamBalance(teams[0], teams[1]);
        }
        return teams;
    }
    static distributeRequiredRoles(players, teamSize, requiredRoles) {
        const team1 = {
            id: "team1",
            players: [],
            averageMmr: 0,
            totalMmr: 0,
        };
        const team2 = {
            id: "team2",
            players: [],
            averageMmr: 0,
            totalMmr: 0,
        };
        requiredRoles.forEach((role, index) => {
            const availablePlayers = players.filter((p) => p.preferredRoles.includes(role.name) &&
                !team1.players.includes(p) &&
                !team2.players.includes(p));
            if (availablePlayers.length > 0) {
                const player = availablePlayers.sort((a, b) => b.mmr - a.mmr)[0];
                if (!player)
                    return;
                if (index % 2 === 0) {
                    team1.players.push(player);
                }
                else {
                    team2.players.push(player);
                }
            }
        });
        return [team1, team2];
    }
    static distributeRemainingPlayers(teams, players) {
        const sortedPlayers = [...players].sort((a, b) => b.mmr - a.mmr);
        sortedPlayers.forEach((player, index) => {
            if (!player)
                return;
            const targetTeam = index % 2 === 0 ? teams[0] : teams[1];
            if (targetTeam) {
                targetTeam.players.push(player);
                this.updateTeamStats(targetTeam);
            }
        });
    }
}
exports.TeamBalancerService = TeamBalancerService;
TeamBalancerService.MAX_MMR_DIFFERENCE = 200;
TeamBalancerService.IDEAL_MMR_DIFFERENCE = 100;
TeamBalancerService.ROLE_PRIORITY_WEIGHT = 0.3;
TeamBalancerService.MMR_WEIGHT = 0.7;
//# sourceMappingURL=TeamBalancerService.js.map