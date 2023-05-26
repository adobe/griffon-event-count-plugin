import GPT3Tokenizer from 'gpt3-tokenizer';
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import validationSchemasJSON from './data/validation.schemas.json';
import { GetTextForEvent, GetTextForEventSchema } from './event.translator';

const API_KEY = ''; // ENTER YOUR API KEY HERE
const COMPLETION_INSTANCE_NAME = 'eastus.api.cognitive.microsoft.com'
const COMPLETION_MODEL = 'ModelGPT35Turbo'
const COMPLETION_API_VERSION = '2022-12-01'
const COMPLETION_BASE_PATH = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${COMPLETION_MODEL}`
// const COMPLETION_URL = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${COMPLETION_MODEL}/completions?api-version=${COMPLETION_API_VERSION}`
const MAX_INPUT_TOKENS_LENGTH = 3500;

const EMBEDDINGS_MODEL = 'text-embedding-ada-002'
const EMBEDDINGS_API_VERSION = '2023-03-15-preview'
const EMBEDDINGS_BASE_PATH = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${EMBEDDINGS_MODEL}`

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

// const promptTemplate1 = "Given the following JSON schema definition, can you verify whether the input events are valid.\nSCHEMA:\n{schemaString}\n\n\nEVENTS:\n{eventsString}\nVerify the input events and provide your answer in the JSON format with the following keys for each event in the array:\nresult:<enum value PASSED or FAIL>,reason:<failure reason or empty string if validation passed>,uuid:<event uuid>."
// const promptTemplate2 = `
// You are a data validator bot. Validate the ACP events 
// using <SCHEMA> definition, verify the input <EVENTS> are valid.
// \n<SCHEMA>:\n{schemaString}\n\n\<EVENTS>:\n{eventsString}\n
// Provide the validation results in a JSON format
// \n
// result:<enum value PASSED or FAIL>,reason:<failure reason or empty string if validation passed>,uuid:<event uuid>.`

const promptTemplate = "Your task is to perform the following actions:\
1 - Use the provided event schema definition delimited by ## for schema validation task.\
2 - Validate the provided array of events also delimited by ##.\
3 - Output ONLY an array of json objects summarizing the validation result for each event and containing the keys: uuid, result, reason.\n\
Use the following format for the output.\
uuid: <event uuid>\
result: <enum value FAIL or PASSED>\
reason: <if schema validation result was FAIL, an array of comma-separated failure reason strings, else empty array.\
Each failure reason should clearly report any missing required properties or incorrect property value type.>\n\n\
EVENT SCHEMA DEFINITION: ##{schemaString}##\n\
EVENTS: ##{eventsString}##\n\n\
OUTPUT: \n"

export {setupModelChain, createVectorStore, submitCompletion};

async function setupModelChain() {
    if (API_KEY === '') {
        console.log("Please enter your API key in src/openai.handler.js")
        return;
    }

    // Create prompt template
    const prompt = new PromptTemplate({
        template: promptTemplate,
        inputVariables: ["schemaString", "eventsString"],
      });

    // Create Azure OpenAI model
    const model = new OpenAI({
        // azureOpenAIApiKey: API_KEY,
        // azureOpenAIApiInstanceName: COMPLETION_INSTANCE_NAME,
        // azureOpenAIApiDeploymentName: COMPLETION_MODEL,
        // azureOpenAIApiVersion: COMPLETION_API_VERSION,
        modelName: COMPLETION_MODEL,
        openAIApiKey: API_KEY,
        temperature: 0.2,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        maxTokens: 2000,
        stop: ['"""', "```", "###", "Note"]
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
 
    // Create a chain using model and prompt
    const chain = new LLMChain({ llm: model, prompt: prompt });
    return chain
}

async function submitCompletion(chain, vectorStore, events, nlSchema = false, nlEvents = false) {
    if (API_KEY === '') {
        return 'Please enter your API key in src/openai.handler.js';
    }
    
    if (events.length == 0) {
        return "";
    }
    
    console.log("submitCompletion")

    // Search for the most similar document (schema) for event
    const eventForSchemaSelection = events[0]
    const eventForSchemaSelectionStr = JSON.stringify(eventForSchemaSelection)
    const schemaResult = await vectorStore.similaritySearch(eventForSchemaSelectionStr, 1);
    console.log(`Selected schema for event ${eventForSchemaSelection.payload.ACPExtensionEventType} ${eventForSchemaSelection.payload.ACPExtensionEventSource}: ${eventForSchemaSelectionStr}`);

    // Generate subset of events that can be supplied in the model prompt for validation
    eventsSubset = getEventsForCompletion(schemaResult, events, nlEvents);

    let schemaDoc = schemaResult[0].pageContent;
    
    var schemaString = nlSchema ? GetTextForEventSchema(schemaDoc) : schemaDoc;
   
    let eventsString = eventsSubset;
    
    let res = await openAiCall(chain, schemaString, eventsString)
    console.log(res);
    return res.text;
}

async function openAiCall(chain, schemaString, eventsString) {
    // Print the prompt
    console.log(`Your task is to perform the following actions:\
    1 - Use the provided event schema definition delimited by ## for schema validation task.\
    2 - Validate the provided array of events also delimited by ##.\
    3 - Output ONLY an array of json objects summarizing the validation result for each event and containing the keys: uuid, result, reason.\n\
    Use the following format for the output.\
    uuid: <event uuid>\
    result: <enum value FAIL or PASSED>\
    reason: <if schema validation result was FAIL, an array of comma-separated failure reason strings, else empty array.\
    Each failure reason should clearly report any missing required properties or incorrect property value type.>\n\n\
    EVENT SCHEMA DEFINITION: ##${schemaString}##\n\
    EVENTS: ##${eventsString}##\n\n\
    OUTPUT: \n`
    )

    // Call the chain providing the prompt expansions.
    const res = await chain.call({ 
        schemaString: schemaString, eventsString: eventsString }
    );
    
    return res;
}

function getEventsForCompletion(schema, events, nlEvents = false) {
    const schemaString = JSON.stringify(schema);
    const schemaTokensCount = countTokens(schemaString);
    console.log("schemaTokensCount: " + schemaTokensCount);

    const promptTemplateTokensCount = countTokens(promptTemplate);
    console.log("promptTemplateTokensCount: " + promptTemplateTokensCount);

    const eventsArr = []
    var eventsNL = ""
    var totalTokensCount = schemaTokensCount + promptTemplateTokensCount;
    for (const evt of events) {
        const eventTokensCount = countTokens(JSON.stringify(evt));
        if (totalTokensCount + eventTokensCount > MAX_INPUT_TOKENS_LENGTH) {
            return;
        }
        totalTokensCount = totalTokensCount + eventTokensCount
        console.log("totalTokensCount: " + totalTokensCount);

        eventsNL += ("\n" + GetTextForEvent(evt));
        
        eventsArr.push(evt)
    }
    return nlEvents ? eventsNL : JSON.stringify(eventsArr);   
}

//Returns the number of tokens in a text string
function countTokens(input) {
    if (input == undefined || input.length == 0) {
        return 0;
    }

    const tokenizer = new GPT3Tokenizer({ type: 'gpt3' }); // or 'codex'
    const encoded = tokenizer.encode(input);
    return encoded.bpe.length;
}

// Load JSON file and generate documents
async function loadDoc(file) {
    const jsonArr = file.map(e => JSON.stringify(e))
    const schemas = {
        "schemas": jsonArr
    }

    const loader = new JSONLoader(new Blob([JSON.stringify(schemas)], {type: "application/json"}))
    const docs = await loader.load();
    return docs;
}

// Create a Memory vector store for embeddings
async function createVectorStore() {
    if (API_KEY === '') {
        console.log('Please enter your API key in src/openai.handler.js');
        return;
    }

    // Read event schemas from json file and convert those to documents using JSONLoader
    const documents = await loadDoc(validationSchemasJSON)
    console.log("Created schema documents.")
    // documents.forEach(element => console.log(JSON.stringify(element.pageContent)))
   
    const memoryVectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        new OpenAIEmbeddings({
            modelName: EMBEDDINGS_MODEL,
            openAIApiKey: API_KEY,
            batchSize: 1
        },
        {
            baseOptions: {
                headers: {
                    'api-key': API_KEY,
                },
                params: {
                    'api-version': EMBEDDINGS_API_VERSION
                }
            },
            basePath: EMBEDDINGS_BASE_PATH
        })
    );
    return memoryVectorStore;
}