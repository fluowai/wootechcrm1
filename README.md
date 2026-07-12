<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b5aa1d1b-141a-4afe-9794-832dcce5506f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Docker / Portainer

Para rodar como Stack no Portainer, use o `docker-compose.yml` da raiz. Ele sobe frontend, backend e PostgreSQL com volume persistente.

Guia completo: [docs/PORTAINER_DEPLOY.md](docs/PORTAINER_DEPLOY.md). Use `.env.portainer.example` como base para as variaveis da Stack.
