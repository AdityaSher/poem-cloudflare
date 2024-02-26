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
		return await handleResponse(request,env)
	},
};

async function handleResponse(request,env) {
	// extract the required data from the cloudflare request object
	const continent = request.cf.continent
	const country = request.cf.country
	const region = request.cf.region

	//create the poem using Cloudflare AI
	const prompt = `You are now a poet, write a poem on the following region Continent: ${continent}, Country: ${country}, Region: ${region} `

	let poem = await createPoem(prompt,env)
	poem = poem.replace(/\n/g, '<br>');

	const html_style = "body{padding:6em; font-family: sans-serif;} h1{color:#f6821f;}";

	let html_content = ""
	html_content += "<p>" +  poem + "</p>";
	
	let html = `<!DOCTYPE html>
	<head>
	  <title> Here's a poem for you </title>
	  <style> ${html_style} </style>
	</head>
	<body>
	  <h1>Here's a poem for you</h1>
	  ${html_content}
	</body>`

	return new Response(html, {
		headers: {
			"content-type": "text/html;charset=UTF-8",
		},
	});
}

async function createPoem(input,env) {
	const ai = new Ai(env.AI)
	
	const output = await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
		prompt: input,
		max_tokens: 1000
	})

	console.log(JSON.stringify(output))
	return output.response
}

async function createHash(continent,country,region){
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


