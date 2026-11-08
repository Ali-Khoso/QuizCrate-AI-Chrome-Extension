# QuizCrate AI — Google Classroom Quiz Generator

**Select lectures. Generate quizzes. Study smarter.**

A **ruby-red / rose** Chrome Manifest V3 extension that opens in Chrome's side panel next to Google Classroom. Pick a class, select published lectures, choose question count and difficulty, and generate source-grounded practice questions **without manually downloading and uploading classroom notes**.

> **Status:** Working local MVP and interactive demo. Google OAuth and Gemini integration are implemented but **not configured or live-tested with a real account** in this package. You must supply your own Google Cloud OAuth client ID and Gemini API key. The project is not installed or published to the Chrome Web Store.

![Red QuizCrate AI UI](screenshots/home.png)

## What's included

- Google sign-in with `chrome.identity` and read-only Classroom/Drive OAuth scopes.
- Lists *active* Google Classroom courses; includes published course materials, assignments and announcements where permitted.
- Select multiple lecture posts, filter by subject, select all, and configure **5 / 10 / 15 / 20** questions + easy/medium/hard difficulty.
- Automatically processes selected Google Docs, Google Slides, text-based PDF, DOCX, PPTX and plain text attachments. **No save-to-disk step.**
- Local FastAPI service extracts text and calls Gemini using a **server-side environment variable**, not a public API key in the extension.
- Multiple-choice quiz screen with explanations and lecture attribution.
- Score summary, answer review, browser-local quiz history, and a feedback-template copy action.
- Sample/demo mode works without OAuth, a backend, or an AI key.

## Folder structure

```text
QuizCrate-AI/
├── extension/
│   ├── manifest.json       # Chrome MV3 permissions + OAuth config
│   ├── background.js       # Side-panel launcher
│   ├── sidepanel.html       # Full sidebar UI
│   ├── styles.css          # Red / blush / white theme
│   ├── app.js              # Navigation, Google APIs, file loading, quizzes
│   ├── demo-data.js        # Explicit fictional demo course/question bank
│   └── icons/              # Chrome extension icons
├── server/
│   ├── main.py             # FastAPI, parsing, Gemini JSON generation
│   ├── run.py              # Starts loopback server (127.0.0.1:8787)
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/test_main.py
├── screenshots/            # Screenshots of working local demo
├── PRIVACY.md
├── QUESTIONS_AND_ANSWERS.md
└── README.md
```

## A. Test the UI right now (no account required)

1. Extract the ZIP.
2. Open Chrome and visit `chrome://extensions/`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the **`extension`** directory (not the project root).
5. Click the **QuizCrate AI** toolbar icon. This opens the side panel.
6. Click **Explore the interactive demo** → choose *Analysis of Algorithms* → select lecture(s) → **Generate my quiz** → answer and review.

The demo course and questions are **fictional sample fixtures**; the demo does **not** access a Google account or contact Gemini. A selected subset may have fewer demo questions than the number you selected.

## B. Start the local AI backend (Windows PowerShell)

Prerequisites: Python 3.11+ and an internet connection for the Gemini call.

```powershell
cd QuizCrate-AI\server
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `server/.env`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Create a key in [Google AI Studio](https://aistudio.google.com/apikey). Keep it out of GitHub, JavaScript source, and Chrome storage. Then start the API:

```powershell
python run.py
```

In a browser, verify: `http://127.0.0.1:8787/api/health` (look for `"status":"ok"` and `"ai_configured":true`).

> **Local development only.** Keep the backend on `127.0.0.1`, not `0.0.0.0`. This local service has no account auth or request-rate limiting and must not be exposed to the public internet. For production, deploy an authenticated HTTPS backend with per-user quotas.

## C. Connect the extension to real Google Classroom

1. Load the unpacked `extension` folder in Chrome as in step A. Copy the **32-character extension ID** displayed in `chrome://extensions/`. Keep the extension in the same directory while developing; moving its folder may change the extension ID.
2. Open [Google Cloud Console](https://console.cloud.google.com/), create a project for QuizCrate AI.
3. Enable **Google Classroom API** and **Google Drive API** in **APIs & Services → Library**.
4. Open **Google Auth Platform → Branding / Audience**. Configure your OAuth consent screen. For **Testing**, add your Google account as a test user (where applicable). Declare the exact scopes requested in `manifest.json`.
5. Open **Google Auth Platform → Clients → Create client**. Choose **Chrome Extension** and enter the copied **Item ID** (the extension's 32-character ID).
6. Copy the OAuth **Client ID**. Open `extension/manifest.json`, replace the literal value of `oauth2.client_id` with your new Client ID. Do **not** put a client secret there.
7. Return to `chrome://extensions/` and **Reload** the extension.
8. Open Google Classroom and the QuizCrate AI side panel, click **Connect Google Classroom**, authorize the account, select a class, select lecture material, and click **Generate my quiz**.

**IMPORTANT:** Google Drive `drive.readonly` is a *restricted scope*. For a public release you may need Google's OAuth app verification and potentially additional security review, in addition to Chrome Web Store review. A private testing setup with added test users is different from a publicly verified app. University/school administrators may restrict the app or these API permissions.

## Supported lecture material

| Source | MVP behavior |
| --- | --- |
| Google Docs | Export readable plain text via Google Drive API |
| Google Slides | Export readable slide text via Google Drive API |
| Google Classroom post description | Included as text |
| PDF (with text layer) | Fetch bytes in memory; PyMuPDF extracts text |
| DOCX | Fetch bytes in memory; python-docx extracts paragraphs and tables |
| PPTX | Fetch bytes in memory; python-pptx extracts textual slide shapes and tables |
| TXT / MD / other `text/*` | Read text directly |
| Scanned or image-only PDF | **Not supported:** OCR is not included |
| External links / YouTube / Google Forms / images | **Not read in this MVP**; relevant post description may still be included |
| Password-protected attachments | Cannot be processed |

Limits: maximum 12 Drive attachments per generation, maximum 5 MB per file, ~22 MB request payload, text capped to a bounded context length, and up to 20 AI questions. File access follows the signed-in user's permissions. Materials the Google account cannot access are skipped. Gemini may return fewer questions if the sources are too narrow.

**Workflow:** Chrome OAuth → Classroom REST API → user selects lecture posts → Drive REST API retrieves just their selected readable attachments → local FastAPI parses bytes → Gemini analyzes selected text → quiz returned and rendered in Chrome.

## Privacy and security notes

- **OAuth tokens go only to Google's APIs**, never to QuizCrate's local server or Gemini.
- **Selected lecture content is sent from the extension to the local backend and then to the Gemini API** only when the student clicks Generate Quiz. This is necessary for AI generation. Be sure students understand the data flow before public release.
- Quiz results (course name, date, count, score) are stored in browser-local `chrome.storage.local`; lecture documents are not deliberately persisted to disk or an application database.
- No tracking/advertising SDKs. No lecture content included in backend logs by application code; production hosting and the AI provider may apply their own logs and retention policies.
- Source texts can contain prompt-injection instructions. The AI prompt explicitly tells the model to ignore those instructions, but LLM defenses are not perfect.
- A public product needs user consent, a hosted privacy policy, Google OAuth verification, more robust error handling, quotas, security testing, and secure HTTPS backend authentication.

See [PRIVACY.md](PRIVACY.md) for a draft disclosure, **not** a claim of completed compliance.

## Test suite

```powershell
cd QuizCrate-AI\server
python -m pytest -q
```

Tests cover extraction of PDF/DOCX/PPTX/plain text, insufficient-input handling, and quiz schema validation. The UI flow has been run in a browser test harness using demo content. Live Google sign-in and real Gemini responses require your own credentials and are **not** tested here.

## Troubleshooting

**“Add your Google Chrome Extension OAuth client ID”**: edit `extension/manifest.json` and reload the extension.

**OAuth `redirect_uri_mismatch`, invalid client or app not verified:** check that OAuth type is **Chrome Extension**, Item ID matches the exact installed extension, you added the test account, and you consented to scopes. School accounts may be blocked by admin policies.

**403 from Google Classroom:** ensure Classroom API is enabled and the signed-in user is enrolled in the class.

**403 from Google Drive:** ensure Drive API is enabled and the user has access to the attachment; check OAuth scope and restricted-scope status.

**“Cannot reach the AI server”**: run `python run.py` in `server` and visit `/api/health`.

**“Gemini quota reached”**: your AI Studio project exceeded the model's active quota.

**Selected notes produce no question:** try a text-based PDF, Docs/Slides, DOCX/PPTX; image-only scans and unsupported links do not provide extractable text in this MVP.

## Project tagline

**QuizCrate AI — Select Lectures. Generate Quizzes. Study Smarter.**

### References

- [Google Chrome Extension OAuth](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [Google Classroom REST API](https://developers.google.com/workspace/classroom/reference/rest)
- [Google Drive export formats](https://developers.google.com/workspace/drive/api/guides/ref-export-formats)
- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [Chrome Web Store privacy requirements](https://developer.chrome.com/docs/webstore/program-policies/policies)