# Code Decomposer (EcoRoute Lite)

EcoRoute Lite is a small web app that routes text tasks to a deterministic local processor or, for open-ended requests, to Google's Gen AI API with a configurable Gemma model. The goal is to avoid model calls for work that can be handled with predictable local rules.

## Features

- Runs supported deterministic tasks locally, including email and URL extraction, text statistics, whitespace cleanup, JSON formatting, text case conversion, CSV-to-JSON conversion, and Base64 conversion.
- Routes other prompts to the configured Gemma model through Google's `@google/genai` SDK.
- Offers automatic routing, manual route selection, optional JSON output, and a baseline comparison view.
- Keeps request counters and latency summaries in the browser's local storage.

Local processing does not need an API key. When a request is routed to the model, the prompt is sent from the server to Google using the API key configured by the operator. Do not send sensitive data unless you are comfortable with that service's terms and privacy practices.

## Requirements

- Node.js 22 or newer
- npm
- A Google Gen AI API key only if you want to use model-backed requests

## Run locally

```sh
git clone https://github.com/corruptREGI/code-decomposer.git
cd code-decomposer
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` in place of `cp`.

Open <http://localhost:3000>. To enable model-backed requests, edit `.env` and set `GEMINI_API_KEY` to your own key. The app defaults to `gemma-4-26b-a4b-it`; set `GEMMA_MODEL_ID` if your account has access to a different supported Gemma model. `PORT` changes the server port.

Never commit `.env` or put a real API key in client-side code. `.env.example` contains placeholders only.

## Development commands

```sh
npm run dev      # Start the app server with TypeScript
npm run lint     # Type-check the TypeScript sources
npm run build    # Create the production frontend bundle in dist/
npm start        # Start the app server
npm run preview  # Preview the Vite production bundle
```

## How routing works

The browser sends requests to the Express server. `src/lib/router.ts` classifies supported deterministic operations and executes them locally. Other requests are sent by `server.ts` to the configured model. The status endpoint reports whether a key and model are available. The UI's token, cost, and latency figures are estimates or session measurements; they are not a guarantee of provider billing or energy use.

## Contributing

Bug reports, documentation improvements, and focused code changes are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Please do not include API keys or private user data in issues, logs, or pull requests.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
