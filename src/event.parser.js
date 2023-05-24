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

const defaultNoEvents = 10

// extracts the most recent events that match the provided schema 
// verifies the events match the type and source and returns the last n events that match that or last 10 events if n is not provided
export default function ExtractRelevantEventsForSchema(schema, events, n = defaultNoEvents, type = "generic")  {
    const startTime = Date.now()
    const lastEvents = n > 0 ? n : defaultNoEvents
  
    if (events == undefined || events.length == 0) {
     return
    }
    
    const matchingEvents = events.filter(event => 
      event.type === type &&
      event.payload != undefined &&
      event.payload.ACPExtensionEventSource != undefined &&
      event.payload.ACPExtensionEventType != undefined &&
      schema.properties.payload.properties.ACPExtensionEventSource.const.toLowerCase() === event.payload.ACPExtensionEventSource.toLowerCase() &&
      schema.properties.payload.properties.ACPExtensionEventType.const.toLowerCase() === event.payload.ACPExtensionEventType.toLowerCase()
    );
  
    const lastMatchingEvents = matchingEvents.slice(0, lastEvents)
    console.log("extractRelevantEvents:")
    console.log(lastMatchingEvents);
    const endTime = Date.now()
    const timeTaken = endTime - startTime
    console.log(`extractRelevantEvents took ` + timeTaken +` ms`)

    return lastMatchingEvents
};
