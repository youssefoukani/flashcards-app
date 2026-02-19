# Flashly — Frontend React

## Struttura cartelle

```
flashcards-frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx          ← entry point
    ├── App.jsx           ← routing + CSS globale
    ├── api.js            ← tutte le chiamate al backend Flask
    ├── PrivateRoute.jsx  ← protezione rotte JWT
    ├── AuthPage.jsx      ← login / registrazione
    ├── Dashboard.jsx     ← lista cartelle
    ├── FolderPage.jsx    ← flashcard di una cartella
    └── StudyPage.jsx     ← sessione di studio
```

## Setup

```bash
npm create vite@latest flashcards-frontend -- --template react
cd flashcards-frontend

# Installa dipendenze
npm install
npm install react-router-dom

# Sostituisci src/ con i file generati

# Avvia in development
npm run dev
```

## Dipendenze necessarie

- `react` + `react-dom` (installati da Vite)
- `react-router-dom` → per routing

## Configurazione backend

In `src/api.js` la variabile `BASE_URL` punta a `http://127.0.0.1:5000`.
Cambiala se il tuo Flask è su un altro host/porta.

## Risposta token dal backend

`AuthPage.jsx` cerca nel body della risposta i campi `token` o `access_token`.
Adatta se il tuo backend usa un campo diverso.

## Rotte

| Path              | Componente    | Protetta |
|-------------------|---------------|----------|
| `/`               | AuthPage      | No       |
| `/dashboard`      | Dashboard     | Sì       |
| `/folders/:id`    | FolderPage    | Sì       |
| `/study/:id`      | StudyPage     | Sì       |

## Logica di studio (StudyPage)

- Ogni flashcard ha un **peso** iniziale = 1
- "Lo sapevo" → peso dimezzato (min 0.1)
- "Non lo sapevo" → peso raddoppiato
- La prossima card è estratta con **selezione casuale pesata**
- La sessione termina quando tutte le card sono state indovinate almeno 1 volta