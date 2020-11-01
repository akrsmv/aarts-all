import { AnyConstructor } from "./Mixin"
import { StreamRecord  } from "aws-lambda";

export type IIdentity = any
export type IItemManagerKeys = keyof IItemManager<any>

export interface AartsEvent {
    payload: AartsPayload;
    meta: AartsMeta;
    eventType?: "output" | "input" | undefined;
    jobType?: "short" | "long" | undefined;
}

export interface AartsMeta {
    item: string,
    action: IItemManagerKeys,
    ringToken: string,
    eventSource: string,
    sqsMsgId?: string
}

export interface AartsPayload<T = any> {
    arguments?: any
    identity?: any
    resultItems?: T[]
    selectionSetList?: string
}
export interface IDomainAdapter<BASE_ITEM> {
    lookupItems: Map<string, AnyConstructor<BASE_ITEM>>
    itemManagers: { [key: string]: IItemManager<BASE_ITEM> }
    itemManagerCallbacks: { [key: string]: IItemManagerCallback<BASE_ITEM> }
}

export interface IItemManager<TItem = any> {

    // All methods should have the same signature
    // in order to be able to be called by a loookup based on the action attribute sent inside the messageAttributes of an SQS message
    
    // this is why for example the create is resolving not just to DynamoItems (=TItem[]) (which is only of interest)
    // but is also carying the identity (=AartsPayload) - > TODO revise this, return objects may be narrowed down
    create(item: string, args: AartsEvent): AsyncGenerator<AartsPayload<TItem>, AartsPayload<TItem>, undefined>
    update(item: string, args: AartsEvent): AsyncGenerator<AartsPayload<TItem>, AartsPayload<TItem>, undefined>
    delete(item: string, args: AartsEvent): AsyncGenerator<AartsPayload<TItem>, AartsPayload<TItem>, undefined>
    start(item: string, args: AartsEvent): AsyncGenerator<AartsPayload<TItem>, AartsPayload<TItem>, undefined>
    get(item: string, args: AartsEvent): AsyncGenerator<AartsPayload<TItem>, AartsPayload<TItem>, undefined>
    query(item: string, args: AartsEvent): AsyncGenerator<AartsPayload<TItem>, AartsPayload<TItem>, undefined>
}

export interface IItemManagerCallback<TItem = any> {

    // All methods should have the same signature
    // in order to be able to be called by a loookup based on the action attribute sent inside the messageAttributes of an SQS message
    _onCreate(item: string, dynamodbStreamRecord: StreamRecord | undefined) : Promise<void>
    _onUpdate(item: string, dynamodbStreamRecord: StreamRecord | undefined) : Promise<void>
}