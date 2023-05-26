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

const cors = require('cors');
const express = require('express');
const fs = require('fs');
const https = require('https');
const { HNSWLib } = require('langchain/vectorstores/hnswlib');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PromptTemplate } = require('langchain/prompts');
const { OpenAI } = require('langchain/llms/openai');
const { LLMChain, VectorDBQAChain } = require('langchain/chains');
const { GithubRepoLoader } = require('langchain/document_loaders/web/github');

const API_KEY = '';
const COMPLETION_API_VERSION = '2022-12-01';
const COMPLETION_BASE_PATH = 'https://eastus.api.cognitive.microsoft.com/openai/deployments/ModelGPT35Turbo';
const COMPLETION_MODEL = 'ModelGPT35Turbo';
const EMBEDDING_API_VERSION = '2023-05-15';
const EMBEDDING_BASE_PATH = 'https://eastus.api.cognitive.microsoft.com/openai/deployments/text-embedding-ada-002';
const EMBEDDING_MODEL = 'text-embedding-ada-002';

// Set up Express app
const app = express();

app.use(cors({
  origin : '*',
  preflightContinue: true
}));

// Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const openAIEmbeddings = new OpenAIEmbeddings({
  modelName: EMBEDDING_MODEL,
  openAIApiKey: API_KEY,
  temperature: 0.2,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 6000,
  stop: ['EOF']
},
{
  baseOptions: {
      headers: {
          'api-key': API_KEY,
      },
      params: {
          'api-version': EMBEDDING_API_VERSION
      }
  },
  basePath: EMBEDDING_BASE_PATH
});

// Question endpoint
app.post('/api/question', async (req, res) => {
  // Get the search query and APIKey from the request body
  console.log(req.body);
  const { question, apikey } = req.body;

  // Instantiate the OpenAI model
  const llm = new OpenAI({
    modelName: COMPLETION_MODEL,
    openAIApiKey: API_KEY,
    temperature: 0.9,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    maxTokens: 2000,
    stop: ['EOF']
  },
  {
    baseOptions: {
        headers: {
            'api-key': API_KEY,
        },
        params: {
            'api-version': COMPLETION_API_VERSION
        }
    },
    basePath: COMPLETION_BASE_PATH
  });

  const directory = `./vectorStore/`
  // Load the vector store from the same directory
  let vectorStore
  try {
    vectorStore = await HNSWLib.load(directory, openAIEmbeddings);
  } catch (err) {
    console.log(err);
    // If the vector store doesn't exist yet, create a default one
    vectorStore = null
  }

  const template = `
  A Validation Plugin is a scoped javascript function. The function takes in as its parameters events which is an array of Objects.
  Some event objects will have the following data structure:
  {eventInfo}\n
  Use the uuid value as the event identifier.
  Find events using values from ACPExtensionEventSource and ACPExtensionEventType.
  The validation function returns an object comprising of the following:
    message- Validation message to display in the results.
    events- Array of event uuids to be reported as matched or not matched.
    result- The validation result with enumerated values "matched", "not matched" or "unknown"'
  The validation function should validate the following:
  {promptText}
  Comment "EOF" after each function to indicate the end of the function.
  Generate the validation function:
`;
  const prompt = new PromptTemplate({
    template,
    inputVariables: ['eventInfo', 'promptText']
  });
  const chain = new LLMChain({ llm, prompt });

  let response;
  try {
    if (vectorStore) {
      // search the documents for any relevant event information
      const eventDocs = await vectorStore.similaritySearch(question, 1);

      response = await chain.call({
        eventInfo: eventDocs[0].pageContent,
        promptText: question
      });

      console.log(response);

      // Return the response to the user
      res.json({ response: response.text })
    } else {
      // We don't have a vector store yet, so we'll just use a template
      response = await chain.call({
        eventInfo: '',
        promptText: question
      });

      // Return the response to the user
      res.json({ response: response.text })
    }
  } catch (err) {
    console.log(err);
    console.error(err.response?.data);
    res.status(500).json({ message: 'Error processing the request' })
  }
})

app.post('/api/parser', async (req, res) => {
  const { url } = req.body;
  console.log(url);
  if (!url) {
    console.log("No URL provided");
    return;
  }
  const loader = new GithubRepoLoader(url, { branch: 'main', recursive: true, unknown: 'warn' });
  const docs = await loader.load();

  console.log(docs.length);

  const directory = `./vectorStore/`

  // Create a new document for the URL
  let vectorStore
  let already = false

  try {
    // Load the vector store from the exisiting directory
    vectorStore = await HNSWLib.load(directory, openAIEmbeddings);

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      await vectorStore.addDocuments([doc]);
    }
  } catch (err) {
    // If the vector store doesn't exist yet, create a new one
    console.log(err);
    console.error(err.response?.data);
    vectorStore = await HNSWLib.fromDocuments([docs[0]], openAIEmbeddings);
  }

  // Save the vector store to a directory
  await vectorStore.save(directory)

  try {
    // Return the response to the user
    res.json({ response: 'success', already: already })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error processing conversation request' })
  }
});

const privateKey = fs.readFileSync('', 'utf8');
const certificate = fs.readFileSync('', 'utf8');

// Create HTTP server
https.createServer({ key: privateKey, cert: certificate }, app).listen(8443);
console.info('GitHub API is listening on port ' + 8443);