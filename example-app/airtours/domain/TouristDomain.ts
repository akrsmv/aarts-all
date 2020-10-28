import { BaseDynamoItemManager } from "aarts-item-manager/BaseItemManager"
import { DdbGetInput, DdbQueryInput } from "aarts-dynamodb/interfaces"
import { TouristItem } from "../__bootstrap/_DynamoItems"
import { AartsPayload, IIdentity } from "aarts-types/interfaces"
import { ppjson } from "aarts-utils"

export class TouristDomain extends BaseDynamoItemManager<TouristItem> {
    /**
     * Validating the query parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateCreate(tourist: TouristItem, identity: IIdentity): AsyncGenerator<AartsPayload, TouristItem, undefined> {
        const errors: string[] = []
        if (errors.length > 0) {
            yield { resultItems: [{ message: `Create Tourist Failed` }, errors] }
            throw new Error(`${errors.join(";;")}`)
        } else {
            yield { resultItems: [{ message: `Successfuly created Tourist` }] }
            return tourist
        }
    }
    /**
     * Validating the query parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateUpdate(tourist: TouristItem, identity: IIdentity): AsyncGenerator<AartsPayload, TouristItem, undefined> {
        const errors: string[] = []
        if (errors.length > 0) {
            yield { resultItems: [{ message: `Update Tourist Failed` }, errors] }
            throw new Error(`${errors.join(";;")}`)
        } else {
            yield { resultItems: [{ message: `Successfuly updated Tourist` }] }
            return tourist
        }
    }
    /**
     * Validating the query parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateDelete(tourist: TouristItem, identity: IIdentity): AsyncGenerator<AartsPayload, TouristItem, undefined> {
        const errors: string[] = []
        if (errors.length > 0) {
            yield { resultItems: [{ message: `Delete Tourist Failed` }, errors] }
            throw new Error(`${errors.join(";;")}`)
        } else {
            yield { resultItems: [{ message: `Successfuly deleted Tourist` }] }
            return tourist
        }
    }
    /**
     * Validating the query parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateQuery(args: DdbQueryInput, identity: IIdentity): AsyncGenerator<AartsPayload, DdbQueryInput, undefined> {
        return args
    }
    /**
     * Validating the get parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateGet(args: DdbGetInput, identity: IIdentity): AsyncGenerator<AartsPayload, DdbGetInput, undefined> {
        return args
    }
}