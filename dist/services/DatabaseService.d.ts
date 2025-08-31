export declare class DatabaseService {
    private static instance;
    private db;
    private dbPath;
    private constructor();
    static getInstance(dbPath?: string): DatabaseService;
    initDatabase(): Promise<void>;
    run(sql: string, params?: any[]): Promise<{
        id: number;
        changes: number;
    }>;
    get(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    transaction<T>(callback: () => Promise<T>): Promise<T>;
    close(): void;
    migrate(sql: string): Promise<void>;
    tableExists(tableName: string): Promise<boolean>;
    getTableInfo(tableName: string): Promise<any[]>;
    backup(backupPath: string): Promise<void>;
    restore(backupPath: string): Promise<void>;
}
//# sourceMappingURL=DatabaseService.d.ts.map