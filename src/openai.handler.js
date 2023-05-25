// ENTER YOUR API KEY HERE
const API_KEY = '';
const COMPLETION_MODEL = 'ModelGPT35Turbo'
const COMPLETION_API_VERSION = '2022-12-01'
const COMPLETION_URL = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${COMPLETION_MODEL}/completions?api-version=${COMPLETION_API_VERSION}`

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

export {SubmitCompletion};

async function SubmitCompletion(schema, events, promptText) {
    if (!API_KEY) {
        setResponseText('Please enter your API key in src/app.jsx');
        return;
    }
  
    const response = await fetch(COMPLETION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': API_KEY
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
    return json;
}