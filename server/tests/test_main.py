import base64
import io
import pytest
import fitz
from docx import Document
from fastapi import HTTPException
from pptx import Presentation
from main import FileInput, SourceInput, QuizQuestion, prepare_context, extract_document


def to_file(name, mime, data):
    return FileInput(name=name, mimeType=mime, base64=base64.b64encode(data).decode())


def test_extract_text():
    obj = FileInput(name="lecture.txt", mimeType="text/plain", text="Quick sort partitions around a pivot.")
    assert "pivot" in extract_document(obj)


def test_extract_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((40, 40), "Merge sort recurrence 2T(n/2)+n")
    blob = doc.tobytes()
    doc.close()
    assert "Merge sort recurrence" in extract_document(to_file("note.pdf", "application/pdf", blob))


def test_extract_docx():
    doc = Document()
    doc.add_paragraph("Master theorem divides the recurrence into cases.")
    output = io.BytesIO(); doc.save(output)
    assert "Master theorem" in extract_document(to_file("note.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", output.getvalue()))


def test_extract_pptx():
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[1]); slide.shapes.title.text = "Lecture slides"
    slide.placeholders[1].text = "Selection sort scans the suffix"
    output = io.BytesIO(); prs.save(output)
    assert "Selection sort" in extract_document(to_file("note.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", output.getvalue()))


def test_short_source_rejected():
    with pytest.raises(HTTPException) as e:
        prepare_context([SourceInput(title="Lecture", description="Short")])
    assert e.value.status_code == 422


def test_long_source_accepted():
    text = "Selection sort finds the minimum remaining element, moves it to the front, and repeats. " * 4
    context, names = prepare_context([SourceInput(title="Selection sort", description=text)])
    assert "minimum" in context
    assert names == ["Selection sort"]


def test_bad_answer_index_rejected():
    with pytest.raises(Exception):
        QuizQuestion(question="What is time complexity?", options=["a", "b", "c", "d"], answerIndex=4, explanation="Because the recurrence implies it.", sourceTitle="Lecture")


def test_duplicate_choices_rejected():
    with pytest.raises(Exception):
        QuizQuestion(question="What is time complexity?", options=["O(n)", "O(n)", "O(1)", "O(log n)"], answerIndex=0, explanation="Because the recurrence implies it.", sourceTitle="Lecture")


def test_api_health_does_not_treat_placeholder_as_configured(monkeypatch):
    from fastapi.testclient import TestClient
    from main import app

    monkeypatch.setenv("GEMINI_API_KEY", "replace_with_your_gemini_api_key")
    assert TestClient(app).get("/api/health").json()["ai_configured"] is False
    monkeypatch.setenv("GEMINI_API_KEY", "valid-looking-test-key")
    assert TestClient(app).get("/api/health").json()["ai_configured"] is True


def test_api_rejects_oversized_request_before_validation():
    from fastapi.testclient import TestClient
    from main import app, MAX_PAYLOAD_BYTES

    response = TestClient(app).post(
        "/api/generate", content=b"X" * (MAX_PAYLOAD_BYTES + 1),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 413
    assert "22 MB" in response.json()["detail"]


def test_invalid_base64_rejected():
    data = FileInput(name="lesson.pdf", mimeType="application/pdf", base64="not base64!!")
    with pytest.raises(ValueError, match="Invalid base64"):
        extract_document(data)


def test_gemini_response_deduplicates_questions_and_checks_sources(monkeypatch):
    import asyncio
    import json
    from main import ask_gemini

    a = {"question": "What does a pivot do in Quick Sort?", "options": ["Splits input", "Sorts all elements", "Uses counting", "Builds a tree"], "answerIndex": 0, "explanation": "The pivot is used to partition the collection.", "sourceTitle": "Week 1"}
    b = {**a, "question": "  WHAT DOES A PIVOT DO IN QUICK SORT?  "}
    c = {**a, "question": "Why is this question not supported?", "sourceTitle": "Unselected Lecture"}
    d = {**a, "question": "What does partitioning achieve in Quick Sort?"}

    class FakeResponse:
        def raise_for_status(self):
            pass
        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": json.dumps({"questions": [a, b, c, d]})}]}}]}

    class FakeClient:
        def __init__(self, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("main.httpx.AsyncClient", FakeClient)
    result = asyncio.run(ask_gemini("Week 1 source content " * 25, ["Week 1"], 4, "easy"))
    assert len(result.questions) == 2
    assert all(q.sourceTitle == "Week 1" for q in result.questions)
