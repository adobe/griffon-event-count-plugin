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

export {GetTextForEvent, GetTextForEventSchema};

function GetTextForEvent(event) {
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
      
    let eName = payload.ACPExtensionEventName;
    let uuid = event.uuid;
    let ts = event.timestamp;
    let type = payload.ACPExtensionEventType;
    let source = payload.ACPExtensionEventSource;
  
    eventText = `Event ${eName} with uuid ${uuid} of type ${type} and source ${source} at timestamp ${ts}`;
    if (flattenedEventData != undefined) {
        let eventDataString = JSON.stringify(flattenedEventData);
      eventText += ` with data ${eventDataString}`;
    }
  
    if (flattenedMetadata != undefined) {
        let metadataString = JSON.stringify(flattenedMetadata);
      eventText += ` with metadata ${metadataString}`
    }
  
    console.log(eventText);  
  
    return eventText
  };

  function GetTextForEventSchema(schemaString) {
    var schemaText = "invalidEvent"
    let schema = JSON.parse(schemaString)
 
    console.log(schema.properties);
    
    let type = schema.properties.payload.properties.ACPExtensionEventType.const;
    let source = schema.properties.payload.properties.ACPExtensionEventSource.const;

    schemaText = `Schema set of rules to validate the. Event must have ACPExtensionEventType = ${type} and ACPExtensionEventSource = ${source}. `
    const requiredEventProperties = schema.required;
    if(requiredEventProperties != null && requiredEventProperties.length > 0) {
        schemaText += "Event must have this properties. ";
        requiredEventProperties.forEach(prop => {
            schemaText += ` ${prop},`;
        })
    }
  
    const requiredEventFields = schema.properties.payload.required
    if(requiredEventFields != null && requiredEventFields.length > 0) {
        schemaText += "Event data must have these required fields.";
        requiredEventFields.forEach(field => {
            schemaText += ` ${field},`;
        })
      
    }
    
    console.log(schemaText);
    
  
    return schemaText
  }