import { DynamoItem } from "aarts-dynamodb/BaseItemManager";


import {
    _specs_AirplaneItem as AirplaneItem,
    _specs_AirplaneManifacturerItem as AirplaneManifacturerItem,
    _specs_AirplaneModelItem as AirplaneModelItem,
    _specs_AirportItem as AirportItem,
    _specs_CountryItem as CountryItem,
    _specs_FlightItem as FlightItem,
    _specs_TouristItem as TouristItem,
    _specs_DataImporterItem as DataImportProcedure
} from "aarts-dynamodb/__specs__/testmodel/_DynamoItems"
// just reuse the __specs__ test model of aarts-dynamodb lib. There are unit tests over it and also a procedure for seedin data, so its a good start for demo app
export {
    AirplaneItem,
    AirplaneManifacturerItem,
    AirplaneModelItem,
    AirportItem,
    CountryItem,
    FlightItem,
    TouristItem,
    DataImportProcedure
}

// define two domain objects purely from this example app (demonstrate the whole steps needed)
import { City } from "./City";  // the plain js objects (domain items)
import { Pilot } from "./Pilot";

export class CityItem extends DynamoItem(City, "city", [ // the dynamodb wrapper object that we deal with
    {key:"name"},
    {key: "population"},
    {key: "country", ref:"country"}
]) { }
export class PilotItem extends DynamoItem(Pilot, "pilot", [ // the dynamodb wrapper object that we deal with
    {key:"name"},
    {key: "city", ref: "city"},
    {key: "country", ref:"country"}
]) { }  

