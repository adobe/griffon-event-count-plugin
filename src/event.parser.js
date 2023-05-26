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

var flatten = require('flat');

const EVENT_SOURCE_SHARED_STATE = "com.adobe.eventsource.sharedstate";
const EVENT_TYPE_HUB = "com.adobe.eventtype.hub";
const STATE_OWNER_HUB = "com.adobe.module.eventhub";
const defaultNoEvents = 10;

export {GetSchema, GetRegisteredExtensions, ExtractSDKEvents};

function GetSchema(validationSchemaJSON, extensionName) {
  let filteredSchemas = [];
  if(validationSchemaJSON == null) {
    console.log("Error: Validation Schema Json file is invalid!");
    return filteredSchemas;
  }

  for (var key of Object.keys(validationSchemaJSON)) {
    let schemaBody = validationSchemaJSON[key]
   
    if(containsIgnoreCase(schemaBody.shortDesc, extensionName)) {
      filteredSchemas.push(schemaBody);
    }
  }

  return filteredSchemas;
}

function GetRegisteredExtensions(events) {
  const extractedEvents = extractSharedStateEvent(events, STATE_OWNER_HUB);

  if (extractedEvents.length > 0) {
    // Return the top most which is the most recent event
    const event = extractedEvents[0];
    const metadata = event.payload.metadata;
    const stateData = metadata["state.data"];
    const registeredExtensions = stateData.extensions;

    return registeredExtensions;
  }

  // Should never hit this unless no events are there
  return null;
};

// extracts the most recent events that match the provided matcher 
// marcher looks like: {
//   "type" : "com.adobe.eventtype.edge", - required
//   "source" : "com.adobe.eventsource.requestcontent", - required
//   "name": "AEP Request Event", - optional
//   "count" : 2 - optional, defaults to 1
// }
function ExtractSDKEvents(events, matcher, assuranceEventType = "generic")  {
  const eventCount = matcher.count > 0 ? matcher.count : defaultNoEvents
  const shouldMatchName = matcher.name != undefined && matcher.name != null && matcher.name != ""
  
  const extractedEvents = events.filter( event =>
    equalsIgnoreCase(event.type, assuranceEventType) && 
    !ignoreEvent(event) &&
    (!shouldMatchName || equalsIgnoreCase(event.payload.ACPExtensionEventName, matcher.name)) &&
    equalsIgnoreCase(event.payload.ACPExtensionEventType, matcher.type) && 
    equalsIgnoreCase(event.payload.ACPExtensionEventSource, matcher.source)
  );

  const nExtractedEvents = extractedEvents.slice(0, eventCount);

  return nExtractedEvents
};

/*
* Utils
*/

function extractSharedStateEvent(events, stateOwner) {
  // todo: currently retrieving 100 shared state events, we should implement support for filtering all events for a particular matcher
  const matcher = {"type": EVENT_TYPE_HUB, "source": EVENT_SOURCE_SHARED_STATE, "count": 100}
  const extractedEvents = ExtractSDKEvents(events, matcher);

  const extractedSharedStateEvents = extractedEvents.filter( event =>
    equalsIgnoreCase(event.payload.ACPExtensionEventData.stateowner, stateOwner)
  )

  return extractedSharedStateEvents;
};

function ignoreEvent(event) {
  return (event.payload == undefined ||
  event.payload.ACPExtensionEventSource == undefined ||
  event.payload.ACPExtensionEventType == undefined);
};

function getTS() {
  return Date.now();
};

// Check equality for strings
function equalsIgnoreCase(s1, s2) {
  if(s1 == undefined && s2 == undefined) {
    return true;
  } else if(s1 == undefined || s2 == undefined) {
    return false;
  }
  return s1.toLowerCase() === s2.toLowerCase();
};

function containsIgnoreCase(s1, s2) {
  let lowerCaseS1 = s1.toLowerCase();
  let lowerCaseS2  = s2.toLowerCase();

  return lowerCaseS1.includes(lowerCaseS2);
};