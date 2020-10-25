import { BaseDynamoItemManager } from "aarts-item-manager/BaseItemManager"
import { Proc__GenerateInvoicesItem } from "../__bootstrap/_DynamoItems"
import { AartsEvent, AartsPayload, IIdentity, IItemManager  } from "aarts-types/interfaces"


export class Proc__GenerateInvoicesCommand extends BaseDynamoItemManager<Proc__GenerateInvoicesItem> {
    
    /**
    * Command parameters preparation and/or validation
    */
    async *validateStart(proc: AartsPayload<Proc__GenerateInvoicesItem>): AsyncGenerator<AartsPayload, AartsPayload, undefined> {
        proc.arguments.start_date = new Date().toISOString()

        const errors: string[] = []

        // here you can apply further domain logic on permissions, authorizations etc

        // if this method returns without throwing error, the execute method will be called 
        return proc
    }

    /**
    * Command Implementation
    */
    async execute(__type: string, args: AartsEvent) : Promise<Proc__GenerateInvoicesItem> { 

        // command implementation goes here
        // if you need to perform transactional work on another lambda use this.events.push(evnt: AppsyncEvent)

        return args.payload.arguments as Proc__GenerateInvoicesItem
    }
}
