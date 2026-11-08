# QuizCrate AI — Engineering Concepts & Interview Questions

**Q1. Why Manifest V3?**
Chrome's supported extension platform uses a service worker and constrained extension permissions. The MVP keeps the UI in a side panel and doesn't inject scripts into Classroom pages.

**Q2. How does Google OAuth work?**
The Chrome Identity API obtains a Google access token for the explicit read-only scopes configured in the extension manifest. The signed-in user grants consent. The Chrome Extension OAuth Client ID must match the installed extension ID.

**Q3. Why not scrape the Classroom page HTML?**
The official API is less fragile than internal HTML/CSS selectors, supports permission checks, and exposes known resource types. The API can still be restricted by account and administrator policy.

**Q4. What are API scopes?**
Scopes define exactly what a user's consent authorizes. Classroom courses, coursework materials, assignments and announcements have separate read-only scopes. Drive `drive.readonly` is restricted and requires careful review for public distribution.

**Q5. What does the Chrome side panel do?**
It shows QuizCrate next to the Google Classroom tab. Students browse courses, choose lectures and take quizzes without switching to an external AI site.

**Q6. How do Google Drive exports work?**
A native Google Doc or Slide is converted by Drive's `files.export` endpoint into plain text. PDFs, DOCX and PPTX are read as binary data for temporary backend extraction.

**Q7. Why use FastAPI?**
FastAPI has request validation, convenient JSON endpoints and support for Python document-parsing libraries.

**Q8. Why keep the Gemini key on the backend?**
A hardcoded secret in a Chrome extension is distributed to users and can be extracted. A server-side key is safer, although the backend needs authentication and rate limits before being exposed publicly.

**Q9. What is prompt injection in lecture notes?**
Untrusted source documents could contain commands intended to redirect the model. The backend tells Gemini to treat lecture content as reference data, not instructions; additional safeguards are needed in production.

**Q10. How are questions checked?**
The generated JSON is parsed into typed Pydantic models: one question, four nonblank distinct options, answerIndex 0–3, explanation, and matching selected lecture source title. This checks structure, not absolute factual correctness.

**Q11. Can scanned PDF pages work?**
Not yet. This MVP extracts existing text from PDF pages and will reject image-only PDF scans with too little readable content. OCR could be added later.

**Q12. Are questions guaranteed accurate?**
No. The AI is instructed to use only selected content and explain each answer, but generated answers can still be mistaken. Students should verify critical points against the actual lecture.

**Q13. Where are user scores stored?**
Browser-local storage (`chrome.storage.local`) holds only quiz history metadata, not document content.

**Q14. Why is localhost not a production backend?**
A loopback development server is convenient for testing, but every user would need to install and run Python. Publishing requires secure authenticated HTTPS APIs, per-user quotas, privacy controls and server monitoring.

**Q15. What are the MVP's next milestones?**
End-to-end OAuth testing; extension-ID stabilization; backend auth and user consent; scanned-PDF OCR; better citation granularity (slide/page); robust attachment handling; retry/rate-limit controls; responsive accessibility testing; Chrome Web Store and Google OAuth verification.