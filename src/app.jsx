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
// import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  Button,
  Flex,
  ProgressCircle,
  Provider as SpectrumProvider,
  TextArea,
  View,
  lightTheme
} from '@adobe/react-spectrum';
// import { HumanChatMessage, SystemChatMessage } from 'langchain/dist/schema';
// import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/dist/prompts';
// import { LLMChain } from 'langchain';

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

// ENTER YOUR API KEY HERE
// const apiKey = '8f8717d7d1554376bf6f33cd9860191e';

// const model = new ChatOpenAI({
//   maxTokens: 1000,
//   modelName: 'ModelGPT35Turbo',
//   openAIApiKey: apiKey,
//   stop: '',
//   temperature: 0.7,
//   topP: 0.95,
// }, {
//   baseOptions: {
//     headers: {
//       'api-key': apiKey,
//     },
//     params: {
//       'api-version': '2023-03-15-preview'
//     }
//   },
//   basePath: 'https://eastus.api.cognitive.microsoft.com/openai/deployments/ModelGPT35Turbo'
// });

// let chain;

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
    setResponseText('');
    // if (!apiKey) {
    //   setResponseText('Please enter your API key in src/app.jsx');
    //   return;
    // }

    setLoading(true);

    let response;
    try {
      response = await fetch('https://localhost:8443/api/question', {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify({
          question: promptText
        })
      })
    } catch (e) {
      console.log(e);
      setLoading(false);
      setResponseText('Error: ' + e.message);
      return;
    }

//     const chatPrompt = ChatPromptTemplate.fromPromptMessages([
//       SystemMessagePromptTemplate.fromTemplate(`You are an AI assitant that builds a Javascript function that validates Adobe Assurance events.
// The function receives an events parameter that is an array of objects.
// The function returns an object with the following properties:
//   - message: Validation message to display in the results.
//   - events: Array of event uuids to be reported as matched or not matched.
//   - result: The validation result with enumerated values "matched", "not matched" or "unknown".
// Add an "EOF" comment below the function to indicate the end of the function.  
// `
//       ),
//       HumanMessagePromptTemplate.fromTemplate("{text}")
//     ])
//     const chainB = new LLMChain({
//       prompt: chatPrompt,
//       llm: model
//     });

//     const resB = await chainB.call({
//       text: promptText
//     });
//     console.log(resB);

    const resText = await response.json();

    setLoading(false);
    setResponseText(resText.response);
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
      </View>
    </SpectrumProvider>
  );
}