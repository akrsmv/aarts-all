import { BaseDynamoItemManager, DynamoItem } from "aarts-dynamodb/BaseItemManager"
import { IIdentity } from "aarts-types/interfaces";
import { loginfo } from "aarts-eb-types/aartsEBUtil"

// using the one from the aarts-dynamodb/__specs__
import {_specs_AirportItem as AirportItem} from "aarts-dynamodb/__specs__/testmodel/_DynamoItems"
import { MixinConstructor } from "aarts-types/Mixin";
import { AttributeMap, StreamRecord } from "aws-sdk/clients/dynamodbstreams";
import { fromAttributeMap, versionString } from "aarts-dynamodb/DynamoDbClient";
import { transactUpdateItem } from "aarts-dynamodb/dynamodb-transactUpdateItem"
import {ppjson} from "aarts-utils/utils"

// Although we are reusing dynamoitem definition from the __specs__ we are redefining the manager for that object here
export class AirportManager extends BaseDynamoItemManager<AirportItem> {
    async *validateCreate(airport: AirportItem, identity: IIdentity): AsyncGenerator<string, AirportItem, undefined> {
            const errors: string[] = []

            if (airport.airport_size === 100) {
                errors.push("airport_size: nah 100 is taken")
                yield "airport_size: nah 100 is taken"
            }
            if (airport.airport_size <= 10) {
                errors.push("airport_size: cannot be le than 10")
                yield "airport_size: cannot be le than 10"
            }
            if (airport.airport_size > 1000) {
                errors.push("size: cannot be greater than 1000")
                yield "size: cannot be greater than 1000"
            }

            if (errors.length > 0) {
                console.log('INVALID airport: ', errors)
                throw new Error(`${process.env.ringToken}: ${errors.join(";;")}`)
            } else {
                yield "Voila! A valid airport!"
                loginfo('valid airport','aaAA', airport, {tralala: "123"}, 5, [1,2,3,'create something'])
                return airport
            }
    }

    async *validateUpdate(airport: AirportItem, identity: IIdentity): AsyncGenerator<string, AirportItem, undefined> {
        throw new Error("Method not implemented.")
    }

    // public onCreate = async (__type: string, newImage: DynamoItem) => {
    //     console.log("^^^^^^^^^^^FROM A SPECIFIC ITEM MANAGER BECAUSE HE IMPLEMENTED onCreate " + + "__type: " + __type + ppjson(newImage));
    //     await transactUpdateItem(
    //         newImage,
    //         {
    //             tralalalalalla: 100,
    //             id: newImage.id,
    //             revisions: newImage.revisions,
    //             meta: `${versionString(0)}|${newImage.id.substr(0, newImage.id.indexOf("|"))}`
    //         },
    //         (this.lookupItems.get(newImage.item_type) as unknown as MixinConstructor<typeof DynamoItem>).__refkeys)
    // }
}