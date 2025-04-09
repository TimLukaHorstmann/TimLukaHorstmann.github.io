import json
from sentence_transformers import SentenceTransformer
import PyPDF2
import re

def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def split_text_into_chunks(text, max_chunk_size=400, overlap=100):
    text = re.sub(r'\t+', ' ', text).strip()
    text = re.sub(r'\s+', ' ', text)
    
    section_headers = [
        "EDUCATION", "WORK EXPERIENCE", "EXTRACURRICULAR ACTIVITIES",
        "SKILLS & INTERESTS", "Scholarships & Career Programs", "Awards",
        "Interests"
    ]
    date_pattern = r"(?:Jan|Feb|Mar|Apr|May|June|July|Aug|Sep|Oct|Nov|Dec)\. \d{4}–(?:Jan|Feb|Mar|Apr|May|June|July|Aug|Sep|Oct|Nov|Dec)\. \d{4}"
    
    chunks = []
    current_chunk = ""
    words = text.split(" ")
    
    for word in words:
        if not word:
            continue
        
        is_section = any(word.upper().startswith(header) for header in section_headers)
        is_date = re.match(date_pattern, word)
        
        if (is_section or is_date) and current_chunk:
            if len(current_chunk) > 50:
                chunks.append(current_chunk.strip())
            current_chunk = word
        elif len(current_chunk) + len(word) + 1 <= max_chunk_size:
            current_chunk += " " + word if current_chunk else word
        else:
            if len(current_chunk) > 50:
                chunks.append(current_chunk.strip())
            current_chunk = word
    
    if len(current_chunk) > 50:
        chunks.append(current_chunk.strip())
    
    # Add overlap
    final_chunks = []
    for i, chunk in enumerate(chunks):
        if i > 0 and overlap > 0:
            prev_chunk = chunks[i-1]
            overlap_text = prev_chunk[-overlap:] if len(prev_chunk) > overlap else prev_chunk
            chunk = overlap_text + " " + chunk
        while len(chunk) > max_chunk_size:
            split_point = chunk.rfind(" ", 0, max_chunk_size)
            if split_point == -1:
                split_point = max_chunk_size
            final_chunks.append(chunk[:split_point].strip())
            chunk = chunk[split_point-overlap if split_point > overlap else 0:].strip()
        if len(chunk) > 50:
            final_chunks.append(chunk)
    
    # Merge short final chunk
    if len(final_chunks) > 1 and len(final_chunks[-1]) < 100:
        final_chunks[-2] += " " + final_chunks.pop()
    
    return final_chunks

def main():
    pdf_path = "assets/documents/Resume_TimLukaHorstmann_redacted.pdf"
    output_json = "website/cv_embeddings.json"
    
    text = extract_text_from_pdf(pdf_path)
    print("Raw text length:", len(text))
    print("Raw text preview:", repr(text[:500]))
    
    chunks = split_text_into_chunks(text, max_chunk_size=400, overlap=100)
    
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    cv_data = []
    for chunk in chunks:
        embedding = model.encode(chunk).tolist()
        cv_data.append({
            "chunk": chunk,
            "embedding": embedding
        })
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(cv_data, f, ensure_ascii=False, indent=2)
    
    print(f"Saved {len(cv_data)} embeddings to {output_json}")
    for i, chunk in enumerate(chunks):
        print(f"Chunk {i + 1} ({len(chunk)} chars): {chunk[:100]}...")

if __name__ == "__main__":
    main()