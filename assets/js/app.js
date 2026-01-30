let extractedText = "";

/* FILE UPLOAD */
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") await readPDF(file);
  else if (ext === "pptx") await readPPTX(file);
  else alert("Only PDF or PPTX allowed.");
});

/* PDF */
async function readPDF(file) {
  extractedText = "";
  const reader = new FileReader();
  reader.onload = async function () {
    const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      content.items.forEach(t => extractedText += t.str + "\n");
    }
    alert("PDF loaded!");
  };
  reader.readAsArrayBuffer(file);
}

/* PPTX */
async function readPPTX(file) {
  extractedText = "";
  const zip = await JSZip.loadAsync(file);
  const slides = Object.keys(zip.files).filter(f =>
    f.includes("ppt/slides/slide")
  );
  for (const slide of slides) {
    const xml = await zip.files[slide].async("string");
    const matches = xml.match(/<a:t>(.*?)<\/a:t>/g) || [];
    matches.forEach(m => extractedText += m.replace(/<\/?a:t>/g, "") + "\n");
  }
  alert("PPTX loaded!");
}

/* TEXT UTILS */
function getSentences(text) {
  return text.split(/\n|(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 8);
}

function getWords(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 3);
}

/* QUESTIONS */
function generateMCQ(count, choicesCount) {
  const sentences = getSentences(extractedText);
  const words = getWords(extractedText);
  if (!sentences.length || !words.length) {
    alert("No readable text found.");
    return [];
  }

  return Array.from({ length: count }, (_, i) => {
    const sentence = sentences[i % sentences.length];
    const answer = words[Math.floor(Math.random() * words.length)];
    const choices = new Set([answer]);
    while (choices.size < choicesCount) {
      choices.add(words[Math.floor(Math.random() * words.length)]);
    }
    return {
      type: "mcq",
      question: sentence.replace(new RegExp(answer, "i"), "_____"),
      choices: [...choices].sort(() => Math.random() - 0.5),
      answer
    };
  });
}

function generateEnumeration(count) {
  const words = [...new Set(getWords(extractedText))];
  return Array.from({ length: count }, (_, i) => ({
    type: "enum",
    question: `Enumerate ${i + 3} key terms from the lesson.`,
    answer: words.slice(i * 3, i * 3 + 3)
  }));
}

/* CONTROLS */
function generateQuiz() {
  render([...generateMCQ(5, 4), ...generateEnumeration(2)]);
}

function generateExam() {
  render([...generateMCQ(25, 4), ...generateEnumeration(5)]);
}

/* RENDER */
function render(questions) {
  const output = document.getElementById("output");
  output.innerHTML = "";
  questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "question";
    if (q.type === "mcq") {
      div.innerHTML = `<strong>${i + 1}. ${q.question}</strong>` +
        q.choices.map(c =>
          `<label><input type="radio" name="q${i}"> ${c}</label>`
        ).join("");
    } else {
      div.innerHTML = `<strong>${i + 1}. ${q.question}</strong>
        <p class="small">Answer: ${q.answer.join(", ")}</p>`;
    }
    output.appendChild(div);
  });
}
