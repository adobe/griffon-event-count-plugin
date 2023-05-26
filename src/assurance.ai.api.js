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
import { GetRegisteredExtensions, ExtractSDKEvents} from './event.parser';

export { GetSDKEventsToValidate,  GetAIValidation };

let extensionToTypeMap = {
  "com.adobe.module.analytics" : {
    "type" : "com.adobe.eventtype.generic.track",
    "source" : "com.adobe.eventsource.requestcontent",
    "count" : 2
  },
  "com.adobe.module.configuration" : {
    "type" : "com.adobe.eventtype.configuration",
    "source" : "com.adobe.eventsource.responsecontent",
    "count" : 1
  },
  "com.adobe.edge" : {
    "type" : "com.adobe.eventtype.edge",
    "source" : "com.adobe.eventsource.requestcontent",
    "name": "AEP Request Event",
    "count" : 2
  },
  "com.adobe.optimize" : {
    "type" : "com.adobe.eventtype.edge",
    "source" : "com.adobe.eventsource.requestcontent",
    "name": "Optimize Personalization Request",
    "count" : 2
  },
  "com.adobe.module.lifecycle": {
    "type" : "com.adobe.eventtype.lifecycle",
    "source" : "com.adobe.eventsource.responsecontent",
    "count" : 1
  }
}

// Returns a dictionary with extension name as key and array of events to validate as value
function GetSDKEventsToValidate(events) {
    let extensionsToSDKEventsMap = new Map();
    if (events == undefined || events.length == 0) {
      console.log("Error: No Assurance events found!");
      return extensionsToSDKEventsMap;
    }
  
    let registeredExtensions = GetRegisteredExtensions(events)
    console.log(registeredExtensions);

    for (var name of Object.keys(registeredExtensions)) {
        let matcher = extensionToTypeMap[name];
        if(matcher == null || matcher == undefined) {
          continue;
        }

        let sdkEvents = ExtractSDKEvents(events, matcher);

        console.log("Events extracted for extension: " + name + ":");
        console.log(sdkEvents)

        extensionsToSDKEventsMap.set(name, sdkEvents)
    }

    return extensionsToSDKEventsMap;
  };


async function GetAIValidation(chain, vectorStore, sdkEvents) {
  //const res = await submitCompletion(chain, vectorStore, sdkEvents, true, true); // NaturalLanguage Schema, NaturalLanguage Event
  //const res = await submitCompletion(chain, vectorStore, sdkEvents, true, false); // NaturalLanguage Schema, JSON Event
  const res = await submitCompletion(chain, vectorStore, sdkEvents); // JSON Schema, JSON Event
  return res
};