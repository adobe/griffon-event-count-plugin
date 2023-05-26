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
import { GetSDKEventsToValidate, GetAIValidation}  from './assurance.ai.api';
import { setupModelChain, createVectorStore } from './openai.handler';

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

  const handleAutoValidate = useCallback(async (events) => {
    console.log("handleAutoValidate")
    var resultsForAllExtensions = ""
    setResponseText(resultsForAllExtensions)
  
    setLoading(true);

    const chain = await setupModelChain()
    const vectorStore = await createVectorStore()

    const extensionToEventsMap = GetSDKEventsToValidate(events);
    var firstValidation = true;
    for (const [extensionName, sdkEvents] of extensionToEventsMap) { 
      let result = await GetAIValidation(chain, vectorStore, sdkEvents);
      var resultForExt = ""
      if (!firstValidation) {
        resultForExt += "\n-------------------------------------------------\n"
      }
      resultForExt += "Validation results for the " + extensionName + " extension:\n"
      resultForExt += JSON.stringify(result);

      resultsForAllExtensions += resultForExt
      setResponseText(resultsForAllExtensions)

      firstValidation = false;
    }

    setLoading(false);
  }, [promptText]);

  return (
    <SpectrumProvider colorScheme="light" theme={lightTheme}>
      <View width="size-6000">
        {/* <Flex alignItems="end" justifyContent="space-between" width="100%"> */}
          {/* <TextArea
            label="Prompt"
            onChange={setPromptText}
            width="size-5000"
            value={promptText}
          /> */}
          <Button
            onPress={() => handleAutoValidate(events)}
            variant="cta"
          >
            Auto-validate
          </Button>
          {loading && <ProgressCircle isIndeterminate />}
        {/* </Flex> */}
        <TextArea
          height="size-6000"
          isReadOnly
          label="Response"
          value={responseText}
          width="size-6000"
        />
      </View>
    </SpectrumProvider>
  );
}
