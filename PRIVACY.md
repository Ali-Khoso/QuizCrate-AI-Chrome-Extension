# QuizCrate AI — Draft Privacy Disclosure

**Development draft only. Must be customized and reviewed before public distribution.**

QuizCrate AI is a Chrome extension for converting chosen Google Classroom lecture materials into AI-generated practice quizzes.

## Data the extension accesses

With the student's consent, the extension uses Google Classroom read-only API permissions to list visible classes, materials, course work, and announcements, and a Google Drive read-only API permission to access selected lecture attachments. It does not submit assignments, alter classes, or modify Drive files.

## When content is transmitted

Only after a student deliberately selects lectures and clicks **Generate my quiz**, text of those lecture posts and supported attachments is transmitted from Chrome to the configured AI backend, which sends that text to Google's Gemini API for question generation. Document bytes may be processed temporarily in memory to extract text. Google OAuth access tokens are not sent to the AI backend or Gemini.

## Local storage

The extension stores local quiz-history metadata (course name, time/date, number correct, total questions and percentage) in browser-local storage. It does not deliberately save lecture documents to disk or an application database.

## Third parties and operations

Google provides the Classroom and Drive APIs and Gemini AI processing. Their data processing terms apply. In a public hosted implementation, hosting providers, logging and monitoring providers, retention policies, sub-processors, user deletion and support mechanisms must be disclosed accurately. The prototype has not completed an external compliance audit or Google OAuth verification.

## User controls

The user can disconnect through Settings, clear local quiz history, and revoke access to the Google OAuth application through their Google Account security settings. Browser removal can clear extension-local data, subject to the browser's storage behavior.

## Contact

Add the developer's verified contact email, privacy-policy URL, effective date, jurisdiction and regulatory disclosures before publishing.