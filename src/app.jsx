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

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Flex,
  ProgressCircle,
  Provider as SpectrumProvider,
  TextArea,
  View,
  lightTheme
} from '@adobe/react-spectrum';
import { AutoValidate}  from './event.parser';

const buildPrompt = (exampleEvent, promptText) => `
  A Validation Plugin is a single javascript function. The function takes in as its parameters events which is an array of Objects.
  The function returns an object comprising of the following:
    message- Validation message to display in the results.
    events- Array of event uuids to be reported as matched or not matched.
    result- The validation result with enumerated values "matched", "not matched" or "unknown"'
  The output function format is shown below:
  function(events) {\n  return {\n    message: \'PASSED!\',\n    events: [],\n    links: [],\n    result: \'matched\'\n  };
  The following is an example event object:
  ${JSON.stringify(exampleEvent, null, 2)}
  The validation function should validate the following:
  ${promptText}
  Generate the validation function:
`

const demoConfigSchema = {
  "$id": "http://griffon.adobe.com/schemas/aep-mobile/configuration",
  "shortDesc": "Configuration Event",
  "group": "event",
  "allOf": [{ "$ref": "http://griffon.adobe.com/schemas/aep-mobile/mobileEvent" }],
  "type": "object",
  "properties": {
    "payload": {
      "inherit": true,
      "type": "object",
      "properties": {
        "ACPExtensionEventData": {
          "inherit": true,
          "type": "object",
          "alias": "eventData",
          "description": "The full list of current configuration values",
          "properties": {
            "build.environment": {
              "alias": "buildEnvironment",
              "description": "In the Launch UI, the type of environment this configuration was generated for",
              "type": "string",
              "mock": "dev"
            },
            "experienceCloud.org": {
              "alias": "experienceCloudOrg",
              "description": "The IMS Org that the mobile app's config was created by",
              "type": "string",
              "mock": "abc@AdobeOrg"
            },
            "property.id": {
              "alias": "launchPropertyId",
              "description": "The ID of the property inside launch",
              "type": "string",
              "mock": "abcd1234"
            },
            "rules.url": {
              "alias": "rulesUrl",
              "description": "The URL to download the rules configuration for the property",
              "type": "string",
              "mock": "http://assets.adobedtm.com/abc/abcdefg-development-rules.zip"
            }
          }
        },
        "ACPExtensionEventSource": {
          "inherit": true,
          "const": "com.adobe.eventSource.responseContent"
        },
        "ACPExtensionEventType": {
          "inherit": true,
          "const": "com.adobe.eventType.lifecycle"
        }
      },
      "required": [
        "ACPExtensionEventData"
      ]
    }
  }
}

// ENTER YOUR API KEY HERE
const apiKey = '';

export default function App() {
  const [settings, setSettings] = useState({});
  const [events, setEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [validation, setValidation] = useState({});

  const [promptText, setPromptText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  const pluginBridge = window.pluginBridge;

  useEffect(() => {
    pluginBridge?.register({
      init: (settings) => {
        console.log('registered!');
        console.log('settings:');
        console.log(settings);
        setSettings(settings);
      },
      receiveEvents: (events) => {
        console.log('received events!');
        console.log(events);
        setEvents(events);
      },
      receiveSelectedEvents: (events) => {
        console.log('received selected events!');
        console.log(events);
        setSelectedEvents(events);
      },
      receiveSession: (session) => {
        console.log('received session!');
        console.log(session);
      },
      receiveValidation: (validation) => {
        console.log('received validation!');
        console.log(validation);
        setValidation(validation);
      }
    })
  }, [pluginBridge]);

  const handleSubmit = useCallback(async () => {
    console.log("handleSubmit")
    if (!apiKey) {
      setResponseText('Please enter your API key in src/app.jsx');
      return;
    }

    setLoading(true);
    const response = await fetch('https://eastus.api.cognitive.microsoft.com/openai/deployments/ModelGPT35Turbo/completions?api-version=2022-12-01', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        prompt: buildPrompt(events[0], promptText),
        max_tokens: 1000,
        temperature: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        stop: null
      })
    });

    const json = await response.json();

    setLoading(false);
    setResponseText(json.choices[0].text);
  }, [promptText]);

  return (
    <SpectrumProvider colorScheme="light" theme={lightTheme}>
      <View width="size-6000">
        <Flex alignItems="end" justifyContent="space-between" width="100%">
          <TextArea
            label="Prompt"
            onChange={setPromptText}
            width="size-5000"
            value={promptText}
          />
          <Button
            isDisabled={loading}
            onPress={handleSubmit}
            variant="cta"
          >
            Submit
          </Button>
          {loading && <ProgressCircle isIndeterminate />}
        </Flex>
        <TextArea
          height="size-6000"
          isReadOnly
          label="Response"
          value={responseText}
          width="size-6000"
        />
          <Button
            onPress={() => AutoValidate(events)}
            variant="cta"
          >
            Auto-validate
          </Button>
      </View>
    </SpectrumProvider>
  );
}
