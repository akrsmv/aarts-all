import { DynamoCommandItem } from "aarts-item-manager/BaseItemManager"
export class DBMigration_AddCreatedIndexForAirport  extends DynamoCommandItem {
    constructor(...args: any[]) { super(args) }
}