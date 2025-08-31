import sqlite3 from "sqlite3";
import path from "path";

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database;
  private dbPath: string;

  private constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(__dirname, "../../aramhouse.db");
    this.db = new sqlite3.Database(this.dbPath);
  }

  /**
   * Obtém a instância única do DatabaseService (Singleton)
   */
  static getInstance(dbPath?: string): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(dbPath);
    }
    return DatabaseService.instance;
  }

  /**
   * Inicializa o banco de dados com as tabelas necessárias
   */
  async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Tabela de jogadores
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

        // Tabela de filas
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

        // Tabela de jogadores na fila
        this.db.run(`
          CREATE TABLE IF NOT EXISTS queue_players (
            queue_id INTEGER,
            player_id TEXT,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (queue_id) REFERENCES queues (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
          )
        `);

        // Tabela de partidas
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

        // Tabela de jogadores por partida
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

        // Tabela de histórico de MMR
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

        // Índices para performance
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_players_mmr ON players(mmr)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_players_discord_id ON players(discord_id)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_mmr_history_player_id ON mmr_history(player_id)`
        );

        this.db.run("PRAGMA foreign_keys = ON", (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Executa uma query de inserção/atualização
   */
  async run(
    sql: string,
    params: any[] = []
  ): Promise<{ id: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Executa uma query e retorna uma única linha
   */
  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Executa uma query e retorna todas as linhas
   */
  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Executa uma transação com retry automático
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
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
                  if (err) reject(err);
                  else resolve(result);
                });
              })
              .catch((error) => {
                this.db.run("ROLLBACK", () => {
                  reject(error);
                });
              });
          });
        });
      } catch (error: any) {
        retryCount++;

        if (error.code === "SQLITE_BUSY" && retryCount < maxRetries) {
          // Aguarda um pouco antes de tentar novamente
          await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
          continue;
        }

        throw error;
      }
    }

    throw new Error("Máximo de tentativas excedido para transação");
  }

  /**
   * Fecha a conexão com o banco
   */
  close(): void {
    this.db.close();
  }

  /**
   * Executa uma query de migração
   */
  async migrate(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Verifica se uma tabela existe
   */
  async tableExists(tableName: string): Promise<boolean> {
    const sql = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `;

    const result = await this.get(sql, [tableName]);
    return !!result;
  }

  /**
   * Obtém informações sobre as colunas de uma tabela
   */
  async getTableInfo(tableName: string): Promise<any[]> {
    return await this.all(`PRAGMA table_info(${tableName})`);
  }

  /**
   * Cria backup do banco de dados
   */
  async backup(backupPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Implementação simples de backup - copia o arquivo
      const fs = require("fs");
      try {
        fs.copyFileSync(this.dbPath, backupPath);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Restaura backup do banco de dados
   */
  async restore(backupPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fs = require("fs");
      try {
        fs.copyFileSync(backupPath, this.dbPath);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
