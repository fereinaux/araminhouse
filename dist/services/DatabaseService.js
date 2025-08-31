"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
class DatabaseService {
    constructor(dbPath) {
        this.dbPath = dbPath || path_1.default.join(__dirname, "../../aramhouse.db");
        this.db = new sqlite3_1.default.Database(this.dbPath);
    }
    static getInstance(dbPath) {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService(dbPath);
        }
        return DatabaseService.instance;
    }
    async initDatabase() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`
          CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            discord_id TEXT UNIQUE,
            mmr INTEGER DEFAULT 1000,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            average_kda REAL DEFAULT NULL,
            preferred_roles TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_game_at DATETIME DEFAULT NULL
          )
        `);
                this.db.run(`
          CREATE TABLE IF NOT EXISTS queues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            size INTEGER NOT NULL,
            status TEXT DEFAULT 'waiting',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME DEFAULT NULL,
            ended_at DATETIME DEFAULT NULL
          )
        `);
                this.db.run(`
          CREATE TABLE IF NOT EXISTS queue_players (
            queue_id INTEGER,
            player_id TEXT,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (queue_id) REFERENCES queues (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
          )
        `);
                this.db.run(`
          CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            queue_id INTEGER,
            winner_team TEXT,
            team1_score INTEGER DEFAULT NULL,
            team2_score INTEGER DEFAULT NULL,
            duration INTEGER DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME DEFAULT NULL,
            FOREIGN KEY (queue_id) REFERENCES queues (id)
          )
        `);
                this.db.run(`
          CREATE TABLE IF NOT EXISTS match_players (
            match_id INTEGER,
            player_id TEXT,
            team TEXT,
            result TEXT,
            role TEXT,
            performance REAL DEFAULT 0.5,
            mmr_change INTEGER DEFAULT 0,
            FOREIGN KEY (match_id) REFERENCES matches (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
          )
        `);
                this.db.run(`
          CREATE TABLE IF NOT EXISTS mmr_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT,
            old_mmr INTEGER,
            new_mmr INTEGER,
            change INTEGER,
            match_id INTEGER,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players (id),
            FOREIGN KEY (match_id) REFERENCES matches (id)
          )
        `);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_players_mmr ON players(mmr)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_players_discord_id ON players(discord_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_mmr_history_player_id ON mmr_history(player_id)`);
                this.db.run("PRAGMA foreign_keys = ON", (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async transaction(callback) {
        const maxRetries = 3;
        let retryCount = 0;
        while (retryCount < maxRetries) {
            try {
                return await new Promise((resolve, reject) => {
                    this.db.serialize(() => {
                        this.db.run("BEGIN TRANSACTION");
                        callback()
                            .then((result) => {
                            this.db.run("COMMIT", (err) => {
                                if (err)
                                    reject(err);
                                else
                                    resolve(result);
                            });
                        })
                            .catch((error) => {
                            this.db.run("ROLLBACK", () => {
                                reject(error);
                            });
                        });
                    });
                });
            }
            catch (error) {
                retryCount++;
                if (error.code === "SQLITE_BUSY" && retryCount < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
                    continue;
                }
                throw error;
            }
        }
        throw new Error("Máximo de tentativas excedido para transação");
    }
    close() {
        this.db.close();
    }
    async migrate(sql) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async tableExists(tableName) {
        const sql = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `;
        const result = await this.get(sql, [tableName]);
        return !!result;
    }
    async getTableInfo(tableName) {
        return await this.all(`PRAGMA table_info(${tableName})`);
    }
    async backup(backupPath) {
        return new Promise((resolve, reject) => {
            const fs = require("fs");
            try {
                fs.copyFileSync(this.dbPath, backupPath);
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async restore(backupPath) {
        return new Promise((resolve, reject) => {
            const fs = require("fs");
            try {
                fs.copyFileSync(backupPath, this.dbPath);
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map