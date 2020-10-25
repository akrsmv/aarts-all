import { BaseDynamoItemManager } from "aarts-dynamodb/BaseItemManager"
import { DdbGetInput, DdbQueryInput } from "aarts-dynamodb/interfaces"
import { AirplaneModelItem } from "../__bootstrap/_DynamoItems"
import { AartsPayload, IIdentity } from "aarts-types/interfaces"
import { ppjson } from "aarts-utils"

export class AirplaneModelDomain extends BaseDynamoItemManager<AirplaneModelItem> {
    async *validateCreate(airplaneModel: AirplaneModelItem, identity: IIdentity): AsyncGenerator<AartsPayload, AirplaneModelItem, undefined> {
        const errors: string[] = []
        if (errors.length > 0) {
            yield { resultItems: [{ message: `Update AirplaneModel Failed  ${ppjson(errors)}` }] }
            throw new Error(`${process.env.ringToken}: ${errors.join(";;")}`)
        } else {
            yield { resultItems: [{ message: `Successfuly updated AirplaneModel` }] }
            return airplaneModel
        }
    }
    async *validateUpdate(airplaneModel: AirplaneModelItem, identity: IIdentity): AsyncGenerator<AartsPayload, AirplaneModelItem, undefined> {
        const errors: string[] = []
        if (errors.length > 0) {
            yield { resultItems: [{ message: `Update AirplaneModel Failed  ${ppjson(errors)}` }] }
            throw new Error(`${process.env.ringToken}: ${errors.join(";;")}`)
        } else {
            yield { resultItems: [{ message: `Successfuly updated AirplaneModel` }] }
            return airplaneModel
        }
    }
    async *validateDelete(airplaneModel: AirplaneModelItem, identity: IIdentity): AsyncGenerator<AartsPayload, AirplaneModelItem, undefined> {
        const errors: string[] = []
        if (errors.length > 0) {
            yield { resultItems: [{ message: `Update AirplaneModel Failed  ${ppjson(errors)}` }] }
            throw new Error(`${process.env.ringToken}: ${errors.join(";;")}`)
        } else {
            yield { resultItems: [{ message: `Successfuly updated AirplaneModel` }] }
            return airplaneModel
        }
    }
    /**
     * Placeholder for validating the query parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateQuery(args: DdbQueryInput, identity: IIdentity): AsyncGenerator<AartsPayload, DdbQueryInput, undefined> {
        return args
    }
    /**
     * Placeholder for validating the get parameters and user identity.
     * Yielded objects should be of the form:
     * yield { resultItems: [{ message: `message here` }] }
     */
    async *validateGet(args: DdbGetInput, identity: IIdentity): AsyncGenerator<AartsPayload, DdbGetInput, undefined> {
        return args
    }
}
