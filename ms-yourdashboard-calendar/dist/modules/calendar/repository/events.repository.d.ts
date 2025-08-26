import { DatabaseService } from 'src/core/database/database.service';
export declare class EventsRepository {
    private readonly db;
    private readonly logger;
    constructor(db: DatabaseService);
    create(event: any): Promise<any>;
    update(eventId: string, event: any): Promise<void>;
    delete(eventId: string): Promise<void>;
}
