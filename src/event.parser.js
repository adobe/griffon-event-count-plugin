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
import validationSchemaJSON from './data/validation.schemas.json';

const EVENT_SOURCE_SHARED_STATE = "com.adobe.eventsource.sharedstate";
const EVENT_TYPE_HUB = "com.adobe.eventtype.hub";
const STATE_OWNER_HUB = "com.adobe.module.eventhub";
const defaultNoEvents = 10;

export {AutoValidate};

function AutoValidate(events) {
  if (events == undefined || events.length == 0) {
    console.log("Empty Assurance events!");
    return;
  }

  console.log(`Assurance Co-Pilot`)
  const registeredExtensions = GetRegisteredExtensions(events)
  console.log(registeredExtensions);

  for (var key of Object.keys(registeredExtensions)) {
    console.log(key)
    console.log(registeredExtensions[key])
  }


  // registeredExtensions.forEach(extensions => {
  //     // for each extension, extract the schemas
      
  console.log(validationSchemaJSON);
  //     //todo:  for each schema, extract relevant events
  //     const relevantEventsForSchema = ExtractRelevantEventsForSchema(schema, events, 2)

  //     // todo: count the tokens for the returned events 
  //     // if over limit, trim down the events
  //     // run prompt template with schema and events
  //     // update the validation results list
  // }); 
  
};

function ValidateOnDemand(schemas, events) {

};

function ReadSchemasFromFile() {
  
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

// extracts the most recent events that match the provided schema 
// verifies the events match the type and source and returns the last n events that match that or last 10 events if n is not provided
function ExtractRelevantEventsForSchema(schema, events, n = defaultNoEvents)  {
  const startTime = getTS()
  const lastEvents = n > 0 ? n : defaultNoEvents
  
  const matchingEvents = extractSDKEvents(events, schema.properties.payload.properties.ACPExtensionEventType.const, schema.properties.payload.properties.ACPExtensionEventSource.const)

  const lastMatchingEvents = matchingEvents.slice(0, lastEvents)
  console.log("extractRelevantEvents:")
  console.log(lastMatchingEvents);
  const endTime = getTS()
  const timeTaken = endTime - startTime
  console.log(`extractRelevantEvents took ` + timeTaken +` ms`)

  return lastMatchingEvents
};

// Utils
function extractSDKEvents(events, type, source, assuranceEventType = "generic") {
  const extractedEvents = events.filter( event =>
    equalsIgnoreCase(event.type, assuranceEventType) && 
    !ignoreEvent(event) &&
    equalsIgnoreCase(event.payload.ACPExtensionEventType, type) && 
    equalsIgnoreCase(event.payload.ACPExtensionEventSource, source)
  );

  return extractedEvents;
};

function extractSharedStateEvent(events, stateOwner) {
  const extractedEvents = extractSDKEvents(events, EVENT_TYPE_HUB, EVENT_SOURCE_SHARED_STATE);

  const extractedSharedStateEvents = extractedEvents.filter( event =>
    equalsIgnoreCase(event.payload.ACPExtensionEventData.stateowner, stateOwner)
  )

  return extractedSharedStateEvents;
};

function getTextForEvent(event) {
  var eventText = "invalidEvent"
  var flattenedEventData = null
  var flattenedMetadata = null

  const payload = event.payload;
  if(payload.ACPExtensionEventData != null) {
    flattenedEventData = flatten(payload.ACPExtensionEventData);
  }

  if(payload.metadata != null) {
    flattenedMetadata = flatten(payload.metadata);
  }
    
  const eName = payload.ACPExtensionEventName;
  const uuid = event.uuid;
  const ts = event.timestamp;
  const type = payload.ACPExtensionEventType;
  const source = payload.ACPExtensionEventSource;

  eventText = `Event ${eName} with uuid ${uuid} of type ${type} and source ${source} at timestamp ${ts}`;
  if (flattenedEventData != undefined) {
    const eventDataString = JSON.stringify(flattenedEventData);
    eventText += ` with data ${eventDataString}`;
  }

  if (flattenedMetadata != undefined) {
    const metadataString = JSON.stringify(flattenedMetadata);
    eventText += ` with metadata ${metadataString}`
  }

  console.log(JSON.stringify(event));
  console.log(eventText);
  

  return eventText
}

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