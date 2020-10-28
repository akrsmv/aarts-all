import * as shell from "shelljs"
import { existsSync, writeFile } from "fs"
import { join, sep } from "path"
import { commandTemplate, domainTemplate, queryTemplate } from "./templates"
import { ppjson } from "aarts-utils"

export type ItemPropertyValue = {
    unique?: boolean | undefined
    indexed?: boolean | undefined
    ref?: string | undefined
    type: string
}

export interface DataModelObject {
    [x: string]: ItemPropertyValue | DataModelObject
}

export interface DataModel {
    Items: { [x: string]: DataModelObject }
    Commands: { [x: string]: DataModelObject }
    Queries: { [x: string]: DataModelObject }
}

const buildPojo = (modelItem: DataModelObject, indent: string = _indent): string => {

    return Object.keys(modelItem).reduce((pojoContents, prop) => !!modelItem[prop].type ?
        pojoContents += `${indent}${prop}?: ${modelItem[prop].type}` + "\n"
        :
        pojoContents += `${indent}${prop}?: {` + "\n" + buildPojo(modelItem[prop] as DataModelObject, indent + _indent) + `${indent}}` + "\n",
        "")
}

const sampleModelObject = (model: DataModelObject) => {
    return Object.keys(model).reduce((accum, prop) => {
        switch (model[prop].type) {
            case "number":
                //@ts-ignore
                accum[prop] = 5
                break
            case "string":
                //@ts-ignore
                accum[prop] = "abc"
                break
            case "boolean":
                //@ts-ignore
                accum[prop] = true
                break
            case "Date":
                //@ts-ignore
                accum[prop] = new Date().toISOString()
                break
            default:
                //@ts-ignore
                accum[prop] = null
                break
        }
        return accum
    }, {})
}
export const _indent = '    '
export const builder = async (model: DataModel | undefined, cwd: string) => {

    const aartsFolderName = "__bootstrap"

    backupPreviousCode(cwd)

    shell.mkdir("-p", join(cwd, aartsFolderName))
    await recordFile(join(cwd, aartsFolderName), "README.md", "Folder contents is managed by aarts-cli.\nYou should not edit manually.\nRather, edit the model-json in the root of your app.")
    shell.mkdir("-p", join(cwd, "__specs__/commands"))
    shell.mkdir("-p", join(cwd, "__specs__/queries"))
    shell.mkdir("-p", join(cwd, "__specs__/domain"))
    shell.mkdir("-p", join(cwd, "__test_events/commands"))
    shell.mkdir("-p", join(cwd, "__test_events/queries"))
    shell.mkdir("-p", join(cwd, "__test_events/domain"))

    const appName = cwd.split(sep).reverse()[0]

    //#region globalDefinitions
    const globalDefinitions =
        "declare module NodeJS {"
        + "    interface Global {"
        + "    domainAdapter: any"
        + "    }"
        + "}"
    console.log("...Generating globalDefinitions: " +
        (await recordFile(join(cwd, aartsFolderName), "globalDefinitions.ts", globalDefinitions)))

    //#endregion

    if (!model) {
        console.log("Model passed is undefined. Skiping items generation")
        return
    }

    console.log("Analysing model")
    shell.mkdir("-p", join(cwd, aartsFolderName, "items"))

    //#region items
    for (const item of Object.keys(model.Items)) {
        let itemContents = `export class ${item} {` + "\n"
            + `${_indent}constructor(...args: any[]) { }` + "\n"
            + buildPojo(model.Items[item])
            + "}"

        console.log(`...Generating POJO object for ${item}: ${await recordFile(join(cwd, aartsFolderName, "items"), `${item}.ts`, itemContents)}`)
        console.log(`...Generating test event for ${item} domain: ` +
            (await recordFile(join(cwd, "__test_events", "domain"), `${item}-create.json`, ppjson({
                action: "create",
                item: item,
                arguments: sampleModelObject(model.Items[item]),
                identity: {
                    username: "testuser"
                }
            }))))

        console.log(`...Generating test event for ${item} domain: `
            + (await recordFile(join(cwd, "__test_events", "domain"), `${item}-update.json`, ppjson({
                action: "update",
                item: item,
                arguments: Object.assign({
                    id: "id-of-item-to-be-updated",
                    revisions: "sending-latest-rev-of-updated-item-mandatory",
                }, sampleModelObject(model.Items[item])),
                identity: {
                    username: "testuser"
                }
            }))))

    }

    console.log(`...Generating generic test event - delete of domain item: ` + await recordFile(join(cwd, "__test_events"), `delete.json`, ppjson({
        action: "delete",
        item: "any-domain-item",
        arguments: {
            pks: [{
                id: "id-of-item-to-be-deleted-1",
                revisions: "sending-latest-rev-of-deleted-item-mandatory-1"
            },
            {
                id: "id-of-item-to-be-deleted-2",
                revisions: "sending-latest-rev-of-deleted-item-mandatory-2"
            }],
        },
        identity: {
            username: "testuser"
        }
    })))

    console.log(`...Generating generic test event - get domain items: ` +
        (await recordFile(join(cwd, "__test_events"), `get.json`, ppjson({
            action: "delete",
            item: "any-domain-item",
            arguments: {
                pks: [{
                    id: "id-of-item-to-be-retrieved-1",
                },
                {
                    id: "id-of-item-to-be-retrieved-2",
                }],
            },
            identity: {
                username: "testuser"
            }
        }))))

    console.log(`...Generating generic test event - query for domain item: `
        + (await recordFile(join(cwd, "__test_events"), `query.json`, ppjson({
            action: "query",
            item: "any-domain-item",
            arguments: {
                pk: "PK value for the search",
                range: "RANGE value for the search, not applied is begins_with",
                ddbIndex: "meta__id | meta__smetadata | meta__nmentadata | smetadata__meta | nmetadata__meta",
                loadPeersLevel: 1,
                peersPropsToLoad: []
            },
            identity: {
                username: "testuser"
            }
        }))))

    //#endregion

    //#region commands
    for (const item of Object.keys(model.Commands)) {
        let itemContents = `import { DynamoCommandItem } from "aarts-item-manager/BaseItemManager"` + "\n"
            + `export class ${item}  extends DynamoCommandItem {` + "\n"
            + `    constructor(...args: any[]) { super(args) }` + "\n"
        Object.keys(model.Commands[item]).forEach(prop => {
            itemContents += `    public ${prop}?: ${model.Commands[item][prop].type}` + "\n"
        })
        itemContents += "}"
        console.log(`...Generating POJO object for ${item} command: `
            + (await recordFile(join(cwd, "__bootstrap", "items"), `${item}.ts`, itemContents)))

        console.log(`...Generating test event for ${item} command: `
            + (await recordFile(join(cwd, "__test_events", "commands"), `${item}-start.json`, ppjson({
                action: "start",
                item: item,
                arguments: sampleModelObject(model.Commands[item]),
                identity: {
                    username: "testuser"
                }
            }))))

    }
    //#endregion

    //#region queries
    for (const item of Object.keys(model.Queries)) {

        let itemContents = `export class ${item} {` + "\n"
            + `    constructor(...args: any[]) { }` + "\n"
        Object.keys(model.Queries[item]).forEach(prop => {
            itemContents += `    public ${prop}?: ${model.Queries[item][prop].type}` + "\n"
        })
        itemContents += "}"
        console.log(`...Generating POJO object for ${item} query`
            + await recordFile(join(cwd, "__bootstrap", "items"), `${item}.ts`, itemContents))
        console.log(`...Generating test event for ${item} query:`
            + await recordFile(join(cwd, "__test_events", "queries"), `${item}-query.json`, ppjson({
                action: "query",
                item: item,
                arguments: sampleModelObject(model.Queries[item]),
                identity: {
                    username: "testuser"
                }
            })))
    }
    //#endregion


    //#region _DynamoItems
    let _DynamoItemsContents = `import { DynamoItem } from "aarts-dynamodb/DynamoItem"` + "\n"

    for (const item of Object.keys(model.Items).concat(Object.keys(model.Commands)).concat(Object.keys(model.Queries))) {
        _DynamoItemsContents += `import { ${item} } from "./items/${item}"` + "\n"
    }
    _DynamoItemsContents += "\n"
    for (const item of Object.keys(model.Items).concat(Object.keys(model.Queries))) {
        _DynamoItemsContents += `const __type__${item}: string = "${item}"` + "\n"
    }
    for (const item of Object.keys(model.Commands)) {
        _DynamoItemsContents += `const __type__${item}: string = "P__${item}"` + "\n"
    }
    _DynamoItemsContents += "\n"
    for (const item of Object.keys(model.Items)) {
        _DynamoItemsContents += `export class ${item}Item extends DynamoItem(${item}, __type__${item}, [` + "\n"
        Object.keys(model.Items[item]).forEach(prop => {
            if (model.Items[item][prop].indexed || model.Items[item][prop].unique || model.Items[item][prop].ref) {
                _DynamoItemsContents += `    { key:"${prop}"`
                    + `${model.Items[item][prop].unique ? ', unique: true' : ''} `
                    + `${model.Items[item][prop].ref ? ', ref: __type__' + model.Items[item][prop].ref : ''}`
                    + "},\n"
            }
        })
        _DynamoItemsContents += "]) { }\n"
    }
    for (const item of Object.keys(model.Commands)) {
        _DynamoItemsContents += `export class ${item}Item extends DynamoItem(${item}, __type__${item}, [` + "\n"
        Object.keys(model.Commands[item]).forEach(prop => {
            if (model.Commands[item][prop].indexed || model.Commands[item][prop].unique || model.Commands[item][prop].ref) {
                _DynamoItemsContents += `    { key:"${prop}"`
                    + `${model.Commands[item][prop].unique ? ', unique: true' : ''} `
                    + `${model.Commands[item][prop].ref ? ', ref: __type__' + model.Commands[item][prop].ref : ''}`
                    + "},\n"
            }
        })
        _DynamoItemsContents += "]) { }\n"
    }
    for (const item of Object.keys(model.Queries)) {
        _DynamoItemsContents += `export class ${item}Item extends DynamoItem(${item}, __type__${item}, [` + "\n"
        Object.keys(model.Queries[item]).forEach(prop => {
            if (model.Queries[item][prop].indexed || model.Queries[item][prop].unique || model.Queries[item][prop].ref) {
                _DynamoItemsContents += `    { key:"${prop}"`
                    + `${model.Queries[item][prop].unique ? ', unique: true' : ''} `
                    + `${model.Queries[item][prop].ref ? ', ref: __type__' + model.Queries[item][prop].ref : ''}`
                    + "},\n"
            }
        })
        _DynamoItemsContents += "]) { }\n"
    }
    console.log(`...Generating _DynamoItems.ts: `
        + await recordFile(join(cwd, "__bootstrap"), "_DynamoItems.ts", _DynamoItemsContents))
    //#endregion

    //#region index.ts 
    let indexContents =
        `import { DynamoItem } from "aarts-dynamodb/DynamoItem"` + "\n"
        + `import { BaseDynamoItemManager } from "aarts-item-manager/BaseItemManager"` + "\n"
        + `import { worker } from "aarts-eb-handler"` + "\n"
        + `import { feeder } from "aarts-eb-notifier"` + "\n"
        + `import { controller } from "aarts-eb-dispatcher"` + "\n"
        + `import { IDomainAdapter } from "aarts-types/interfaces"` + "\n"
        + `import { AnyConstructor } from "aarts-types/Mixin"` + "\n"
        + `import { dynamoEventsAggregation } from "aarts-dynamodb-events/dynamoEventsAggregation"` + "\n"
        + `import { dynamoEventsCallback } from "aarts-dynamodb-events/dynamoEventsCallback"` + "\n"
        + `##DYNAMO_ITEMS_IMPORT##` + "\n"
        + `##DYNAMO_ITEMS_PROCESSORS_IMPORT##` + "\n"
        + `const allItems = new Map<string, AnyConstructor<DynamoItem>>()` + "\n"
        + `##ITEMS_MAP_BODY##` + "\n"
        + `const allItemManagers = {` + "\n"
        + `    "BASE": new BaseDynamoItemManager(allItems),` + "\n"
        + `##ITEMS_PROCESSOR_MAP_BODY##` + "\n"
        + `}` + "\n"
        + "class DomainAdapter implements IDomainAdapter<DynamoItem> {\n"
        + `    public lookupItems = allItems` + "\n"
        + `    public itemManagers = allItemManagers` + "\n"
        + `    public itemManagerCallbacks = allItemManagers` + "\n"
        + "}\n"
        + "global.domainAdapter = new DomainAdapter()\n"
        + "\n"
        + "export { controller, worker, feeder, dynamoEventsAggregation, dynamoEventsCallback }\n"
    for (const item of Object.keys(model.Items)) {
        indexContents = indexContents.replace("##DYNAMO_ITEMS_IMPORT##", `import { ${item}Item } from "./_DynamoItems"` + "\n" + "##DYNAMO_ITEMS_IMPORT##")
        indexContents = indexContents.replace("##DYNAMO_ITEMS_PROCESSORS_IMPORT##", `import { ${item}Domain } from "../domain/${item}Domain"` + "\n" + "##DYNAMO_ITEMS_PROCESSORS_IMPORT##")
        indexContents = indexContents.replace("##ITEMS_MAP_BODY##", `allItems.set(${item}Item.__type, ${item}Item)` + "\n" + "##ITEMS_MAP_BODY##")
        indexContents = indexContents.replace("##ITEMS_PROCESSOR_MAP_BODY##", `    [${item}Item.__type]: new ${item}Domain(allItems),` + "\n" + "##ITEMS_PROCESSOR_MAP_BODY##")
    }
    for (const item of Object.keys(model.Commands)) {
        indexContents = indexContents.replace("##DYNAMO_ITEMS_IMPORT##", `import { ${item}Item } from "./_DynamoItems"` + "\n" + "##DYNAMO_ITEMS_IMPORT##")
        indexContents = indexContents.replace("##DYNAMO_ITEMS_PROCESSORS_IMPORT##", `import { ${item}Command } from "../commands/${item}Command"` + "\n" + "##DYNAMO_ITEMS_PROCESSORS_IMPORT##")
        indexContents = indexContents.replace("##ITEMS_MAP_BODY##", `allItems.set(${item}Item.__type, ${item}Item)` + "\n" + "##ITEMS_MAP_BODY##")
        indexContents = indexContents.replace("##ITEMS_PROCESSOR_MAP_BODY##", `    [${item}Item.__type]: new ${item}Command(allItems),` + "\n" + "##ITEMS_PROCESSOR_MAP_BODY##")
    }
    for (const item of Object.keys(model.Queries)) {
        indexContents = indexContents.replace("##DYNAMO_ITEMS_IMPORT##", `import { ${item}Item } from "./_DynamoItems"` + "\n" + "##DYNAMO_ITEMS_IMPORT##")
        indexContents = indexContents.replace("##DYNAMO_ITEMS_PROCESSORS_IMPORT##", `import { ${item}Query } from "../queries/${item}Query"` + "\n" + "##DYNAMO_ITEMS_PROCESSORS_IMPORT##")
        indexContents = indexContents.replace("##ITEMS_MAP_BODY##", `allItems.set(${item}Item.__type, ${item}Item)` + "\n" + "##ITEMS_MAP_BODY##")
        indexContents = indexContents.replace("##ITEMS_PROCESSOR_MAP_BODY##", `    [${item}Item.__type]: new ${item}Query(allItems),` + "\n" + "##ITEMS_PROCESSOR_MAP_BODY##")
    }
    indexContents = indexContents.replace("##DYNAMO_ITEMS_IMPORT##", "");
    indexContents = indexContents.replace("##DYNAMO_ITEMS_PROCESSORS_IMPORT##", "");
    indexContents = indexContents.replace("##ITEMS_MAP_BODY##", "");
    indexContents = indexContents.replace("##ITEMS_PROCESSOR_MAP_BODY##", "");
    console.log(`...Generating index.ts:`
        + await recordFile(join(cwd, "__bootstrap"), "index.ts", indexContents))
    //#endregion

    //#region domain processors
    shell.mkdir("-p", join(cwd, "domain"))
    // const domainTemplate = readFileSync(join("templates","Domain.template")).toString()
    for (const item of Object.keys(model.Items)) {
        console.log(`...Generating domain processor for ${item}: `
            + await recordFile(join(cwd, "domain"), `${item}Domain.ts`, domainTemplate
                .replace(/##ITEM##/g, item)
                .replace(/##ITEM_LOWERC##/g, `${item[0].toLowerCase()}${item.slice(1)}`), false))
    }
    //#endregion

    //#region commands
    shell.mkdir("-p", join(cwd, "commands"))
    // const commandTemplate = readFileSync(join("templates","Command.template")).toString()
    for (const item of Object.keys(model.Commands)) {
        console.log(`...Generating command processor for ${item}: `
            + await recordFile(join(cwd, "commands"), `${item}Command.ts`, commandTemplate
                .replace(/##ITEM##/g, item)
                .replace(/##ITEM_LOWERC##/g, `${item[0].toLowerCase()}${item.slice(1)}`), false))
    }
    //#endregion

    //#region queries
    shell.mkdir("-p", join(cwd, "queries"))
    // const queryTemplate = readFileSync(join("templates","Query.template")).toString()
    for (const item of Object.keys(model.Queries)) {
        console.log(`...Generating query processor for ${item}:`
            + await recordFile(join(cwd, "queries"), `${item}Query.ts`, queryTemplate
                .replace(/##ITEM##/g, item)
                .replace(/##ITEM_LOWERC##/g, `${item[0].toLowerCase()}${item.slice(1)}`), false))
    }
    //#endregion

}

const recordFile = async (dir: string, fileName: string, contents: string, overwrite: boolean = true) => {
    return new Promise((resolve, reject) => {
        if (!overwrite && existsSync(join(dir, fileName))) {
            return resolve(`${join(dir, fileName)} already exists. Skipping`)
        }
        writeFile(join(dir, fileName), contents, err => {
            if (err) return reject(err)
            return resolve(join(dir, fileName))
        })
    })
}

const backupPreviousCode = (cwd: string) => {
    const bakFolder = "__rebuild-model-backup"

    if (existsSync(join(cwd, "__test_events"))) {
        shell.mkdir("-p", join(cwd, bakFolder))
        shell.mv("", join(cwd, "__test_events"), join(cwd, bakFolder))
    }
}
