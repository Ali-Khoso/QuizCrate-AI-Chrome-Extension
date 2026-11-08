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
