/*
 * ************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *   Copyright 2023 Adobe Systems Incorporated
 *   All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by all applicable intellectual property
 * laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 * ************************************************************************
 */
import { submitCompletion } from './openai.handler';
import { GetRegisteredExtensions, GetSchema, ExtractRelevantEventsForSchema, ExtractSDKEvents} from './event.parser';
//import validationSchemaJSON from './data/validation.schemas.json';

export { GetSDKEventsToValidate,  GetAIValidation };

let extensionToTypeMap = {
  "Analytics" : {
    "type" : "com.adobe.eventtype.generic.track",
    "source" : "com.adobe.eventsource.requestcontent",
    "count" : 2
  },

  "Configuration" : {
    "type" : "com.adobe.eventtype.configuration",
    "source" : "com.adobe.eventsource.responsecontent",
    "count" : 1
  }
}

function GetSDKEventsToValidate(events) {
    let extensionsToSDKEventsMap = new Map();
    if (events == undefined || events.length == 0) {
      console.log("Error: No Assurance events found!");
      return extensionsToSDKEventsMap;
    }
  
    let registeredExtensions = GetRegisteredExtensions(events)
    //console.log(registeredExtensions);

    for (var name of Object.keys(registeredExtensions)) {
        let extensionFriendlyName = registeredExtensions[name].friendlyName;
        //console.log(extensionFriendlyName);

        let sdkEventDetails = extensionToTypeMap[extensionFriendlyName];
        if(sdkEventDetails == null) {
          continue;
        }

        let sdkEventType = sdkEventDetails.type;
        let sdkEventSource = sdkEventDetails.source;
        let eventsToExtract = sdkEventDetails.count != null ? sdkEventDetails.count : 2;
        let sdkEvents = ExtractSDKEvents(events, sdkEventType, sdkEventSource, eventsToExtract);

        extensionsToSDKEventsMap.set(extensionFriendlyName, sdkEvents)
        //console.log(extensionsToSDKEventsMap)
    }

    return extensionsToSDKEventsMap;
  };


async function GetAIValidation(chain, vectorStore, sdkEvents) {
    const res = await submitCompletion(chain, vectorStore, sdkEvents);
    return res
};