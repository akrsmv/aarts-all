import { transactPutItem } from "../../dynamodb-transactPutItem";
import { transactUpdateItem } from "../../dynamodb-transactUpdateItem";
import { uniqueitemrefkeyid } from "../../DynamoDbClient";
import { _specs_AirplaneItem } from "../testmodel/_DynamoItems";
import { clearDynamo, queryForId } from "../testutils";

describe('update.unique.number.refkey', () => {
  beforeAll(async (done) => { await clearDynamo(); done() })
  // afterAll(async (done) => { await clearDynamo(); done() })

  test('update unique number refkey', async () => {

    const airplane = new _specs_AirplaneItem()
    airplane.reg_uq_number = 11 // arrange string refkey to be updated, see testmodel

    return await transactPutItem(airplane, _specs_AirplaneItem.__refkeys).then(async arrangedItem => { // arrange existing item

      await transactUpdateItem(arrangedItem, { // update arranged item
        id: arrangedItem.id,
        meta: arrangedItem.meta,
        revisions: arrangedItem.revisions,
        reg_uq_number: 13,
        ringToken: 'test-ring-token'
      }, _specs_AirplaneItem.__refkeys).then(async updateResult => {
        expect(updateResult).toBeInstanceOf(_specs_AirplaneItem)

        const ddbUpdated = await queryForId(arrangedItem.id)
        expect(ddbUpdated.length).toBe(3)//1 main item,2 refkey item copy 3 history record

        const createdConstraints = await queryForId(uniqueitemrefkeyid(airplane, "reg_uq_number"))
        expect(createdConstraints.length).toBe(1)
        expect(createdConstraints[0]).toEqual({ id: uniqueitemrefkeyid(airplane, "reg_uq_number"), meta: "13" })

      })
    })
  })

  test('item updates setting refkeys to already existing unique values are rejected', async () => {
    const airplane = new _specs_AirplaneItem()
    airplane.reg_uq_number = 21
    await transactPutItem(airplane, _specs_AirplaneItem.__refkeys) // arrange one existing

    const airplane1 = new _specs_AirplaneItem()
    airplane1.reg_uq_number = 23
    await transactPutItem(airplane1, _specs_AirplaneItem.__refkeys) // arrange another one 

    return expect(transactUpdateItem(airplane1, { // update arranged item
      id: airplane1.id,
      meta: airplane1.meta,
      revisions: airplane1.revisions,
      reg_uq_number: 21,
      ringToken: 'test-ring-token'
    }, _specs_AirplaneItem.__refkeys)).rejects.toThrow()

    // const ddbUpdated = await queryForId(airplane1.id)
    // expect(ddbUpdated.length).toBe(3) //1 main item,2 refkey item copy 3 history record
    // const mainItem = ddbUpdated.filter(i => i.meta === `${versionString(0)}|${_specs_AirplaneItem.__type}`)[0]
    // const refkeyItemCopy = ddbUpdated.filter(i => i.meta === refkeyitemmeta(airplane, "reg_uq_number"))[0]

    // expect(mainItem).toEqual(airplane1)
    // expect(new Strippable(refkeyItemCopy).stripNmetadata().stripMeta()._obj).toEqual(new Strippable(airplane1).stripMeta()._obj)
  })
})