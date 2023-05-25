import GPT3Tokenizer from 'gpt3-tokenizer';

const API_KEY = ''; // ENTER YOUR API KEY HERE
const COMPLETION_MODEL = 'ModelGPT35Turbo'
const COMPLETION_API_VERSION = '2022-12-01'
const COMPLETION_URL = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${COMPLETION_MODEL}/completions?api-version=${COMPLETION_API_VERSION}`
const MAX_INPUT_TOKENS_LENGTH = 3000;

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

const completionPromptTemplate = (schemaString, eventsString) => `
    You are a friendly assistant that helps validating if the provided input events are valid based on a given JSON schema definition.
    The schema defines the required fields in a case insensitive manner, ignore timestamps and the order of events.
    Schema: ${schemaString}
    Events: ${eventsString} 

    Return the validation result with the following format:
    {"event.uuid": "", "result": ""}  where the result should be PASSED or FAIL depending on the validation result.
`

export {SubmitCompletion, CreatePromptForCompletion};

async function SubmitCompletion(schema, events, promptText) {
    if (!API_KEY) {
        return 'Please enter your API key in src/openai.handler.jsx';
    }

    // todo: extract schemas from embedings for promptText
  
    const response = await fetch(COMPLETION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': API_KEY
        },
        body: JSON.stringify({
            prompt: CreatePromptForCompletion(schema, events),
            max_tokens: 1000,
            temperature: 0.9,
            frequency_penalty: 0,
            presence_penalty: 0,
            top_p: 1,
            stop: null
        })
    });
  
    const json = await response.json();
    return json;
}

// Creates the prompt message for the completion API
function CreatePromptForCompletion(schema, events) {
    const schemaString = JSON.stringify(schema);
    const eventsString = JSON.stringify(events);
    const schemaTokensCount = countTokens(schemaString);
    const eventsTokensCount = countTokens(eventsString);
    console.log("schemaTokensCount: " + schemaTokensCount);
    console.log("eventsTokensCount: " + eventsTokensCount);

    if (schemaTokensCount + eventsTokensCount > MAX_INPUT_TOKENS_LENGTH) {
        // todo: trim down the events
    }

    // create prompt with validation schema and input events
    const prompt = completionPromptTemplate(schemaString, eventsString);
    console.log("prompt: " + prompt);
    return prompt;
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