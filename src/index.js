/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Ai } from '@cloudflare/ai';


export default {
	async fetch(request, env, ctx) {
		return await handleResponse(request, env)
	},
};

async function handleResponse(request, env) {
	// extract the required data from the cloudflare request object
	const continent = request.cf.continent
	const country = request.cf.country
	const region = request.cf.region
	console.log(request.cf.city)
	//create the poem using Cloudflare AI
	const prompt = `You are now a poet, write a poem on the following region Continent: ${continent}, Country: ${country}, Region: ${region} `

	const url = new URL(request.url);
	const path = url.pathname;

	if (path == "/stream") {
		const poemStream = await createPoem(prompt, env)

		return new Response(
			poemStream,
			{ headers: { "content-type": "text/event-stream" } }
		);
	}

	// create a hash and check if poem already exists
	const currentHash = await createHash(continent, country, region)

	const cachedPoem = await env.POEMS.get(currentHash)

	let poem = cachedPoem
	let html_content = ""
	const html_style = "body{padding:6em; font-family: sans-serif;} h1{color:#f6821f;}";

	// for already generated poem, show it directly
	if (cachedPoem) {
		poem = poem.replace(/\n/g, '<br>');
		html_content += "<p>" + poem + "</p>";


		let html = `<!DOCTYPE html>
	<head>
	  <title> Here's a poem for you </title>
	  <style> ${html_style} </style>
	</head>
	<body>
	  <h1>Here's a poem for you</h1>
	  ${html_content}
	</body>`


	}

	// for generating a new poem use the /stream path
	else {
		html_content = `<div id="poem"></div>
    <script>
        const poemDiv = document.getElementById('poem');
        const evtSource = new EventSource('/stream');
        evtSource.onmessage = function(event) {
			if (event.data == "[DONE]") {
				evtSource.close();
				return;
			}
			const eventData = JSON.parse(event.data);
			const poemLine = eventData.response.replace(/\\n/g, '<br>');
            poemDiv.innerHTML +=  poemLine
        };
    </script>`;

	}


	let html = `<!DOCTYPE html>
    <head>
        <title>Here's a poem for you</title>
        <style>${html_style}</style>
    </head>
    <body>
        <h1>Here's a poem for you</h1>
        ${html_content}
    </body>`;

	return new Response(html, {
		headers: {
			"content-type": "text/html;charset=UTF-8",
		},
	});
}

async function createPoem(input, env) {
	const ai = new Ai(env.AI)

	const output = await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
		prompt: input,
		max_tokens: 1000,
		stream: true
	})

	return output
}

// Create a hash by combining the 3 strings and multiplying by 31 (2^5)
async function createHash(continent, country, region) {
	const string = continent + country + region

	let hash = 0;

	if (string.length === 0) {
		return hash;
	}
	for (let i = 0; i < string.length; i++) {
		let char = string.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}


