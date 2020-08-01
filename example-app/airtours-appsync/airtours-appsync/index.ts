import { AirplaneManager } from "./items/Airplane"
import { AirportManager } from "./items/Airport"
import { DynamoItem, BaseDynamoItemManager } from "aarts-dynamodb/BaseItemManager"
import { handler } from "aarts-eb-handler/aartsSqsHandler"
import { handler as notifier } from "aarts-eb-notifier/aartsAppsyncNotifier"
import { handler as dispatcher } from "aarts-eb-dispatcher/aartsSnsDispatcher"
import { handler as dispatcherTester } from "aarts-eb-dispatcher-tester/aartsDispatcherStressTester"
import { IDomainAdapter } from "aarts-types/interfaces"
import { AnyConstructor } from "aarts-types/Mixin"

import {
    AirplaneItem, CountryItem, CityItem, PilotItem, AirportItem,
    AirplaneManifacturerItem, AirplaneModelItem, FlightItem,
    TouristItem, DataImportProcedure, TestDataGeneratorItem, EraseDataItem
} from "./_DynamoItems"
import { EraseDataManager } from "./procedures/EraseData"
import { TestDataGeneratorManager } from "./procedures/TestDataGenerator"

const allItems = new Map<string, AnyConstructor<DynamoItem>>()
allItems.set(AirportItem.__type, AirportItem)
allItems.set(AirplaneItem.__type, AirplaneItem)
allItems.set(AirplaneManifacturerItem.__type, AirplaneManifacturerItem)
allItems.set(AirplaneModelItem.__type, AirplaneModelItem)
allItems.set(CountryItem.__type, CountryItem)
allItems.set(FlightItem.__type, FlightItem)
allItems.set(TouristItem.__type, TouristItem)
allItems.set(CityItem.__type, CityItem)
allItems.set(PilotItem.__type, PilotItem)
allItems.set(DataImportProcedure.__type, DataImportProcedure)
allItems.set(TestDataGeneratorItem.__type, TestDataGeneratorItem)
allItems.set(EraseDataItem.__type, EraseDataItem)

class DomainAdapter implements IDomainAdapter<DynamoItem> {
    public itemManagers = {
        // lib from specs test model
        [AirplaneItem.__type]: new AirplaneManager(allItems),
        [AirplaneModelItem.__type]: new BaseDynamoItemManager(allItems),
        [AirplaneManifacturerItem.__type]: new BaseDynamoItemManager(allItems),
        [AirportItem.__type]: new AirportManager(allItems),
        [FlightItem.__type]: new BaseDynamoItemManager(allItems),
        [CountryItem.__type]: new BaseDynamoItemManager(allItems),
        [TouristItem.__type]: new BaseDynamoItemManager(allItems),
        [DataImportProcedure.__type]: new BaseDynamoItemManager(allItems),

        //defined here
        [CityItem.__type]: new BaseDynamoItemManager(allItems),
        [PilotItem.__type]: new BaseDynamoItemManager(allItems),

        // procedures
        [TestDataGeneratorItem.__type]: new TestDataGeneratorManager(allItems),
        [EraseDataItem.__type]: new EraseDataManager(allItems)
    }
}

global.domainAdapter = new DomainAdapter()

export { dispatcher, dispatcherTester, handler, notifier }

// console.log("fixing a DEBUG issue") // on windows(?), somewhere DEBUG sys var gets reset to undefined, thus DEBUGGER is used to backup 
// in AWS there is no need for it. If you want to deug there - just add DEBUG=1 sys env var 
process.env.DEBUG = process.env.DEBUGGER