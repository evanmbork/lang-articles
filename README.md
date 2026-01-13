# LinguaReader – Hack Week Prototype

## Description

LinguaReader is a prototype web application for language learners that generates custom reading articles using an LLM. Users can choose a target language, reading level, and topics of interest, and the app generates an original article along with optional vocabulary lists and comprehension questions.

The goal of this project was to first build a small full-stack web app using **Vite + React + SCSS** on the frontend and **Express** on the backend, and then to experiment with LLM-powered features such as content generation, word-level linguistic analysis, text-to-speech, local state persistence, and print/PDF styling. The idea was that this could be expanded into a larger language app project for CS 98.

---

## How to Install / Run

### Prerequisite
- An OpenAI API key

---

### Server (Express API)

1. Navigate to the server directory:
cd custom-reader/server

2. Install dependencies:

npm install

3. Create an environment file:

cp .env.example .env

4. Add your OpenAI API key to .env:

OPENAI_API_KEY=your_key_here
PORT=3001

5. Start the server:

npm run dev

The server will run at http://localhost:3001.
