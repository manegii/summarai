
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const dotenv = require("dotenv");
const path = require("path");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});


const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported."));
    }
  }
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function generateSummary(text, length, language = "en-US") {

  const instructions = {
    short:
      "Make a very concise summary containing only the most important points.",

    medium:
      "Create a clear and balanced summary containing the main ideas and important supporting details.",

    long:
      "Create a detailed summary covering the major ideas, important facts, conclusions, and useful supporting details."
  };

  const outputLanguage =
    language === "id-ID"
      ? "Bahasa Indonesia"
      : "English";

  const prompt = `
You are SummarAI, an expert multilingual translation
and summarisation assistant.

TASK:
Read the provided text, understand its original language,
and produce a summary entirely in the selected output language.

OUTPUT LANGUAGE: ${outputLanguage}

SUMMARY LENGTH:
${instructions[length] || instructions.medium}

STRICT RULES:
- Accept input written in ANY language.
- Translate the content into ${outputLanguage} before summarising.
- The final summary MUST be entirely in ${outputLanguage}.
- If the input is English and the output is Bahasa Indonesia,
  translate and summarise into natural Bahasa Indonesia.
- If the input is Bahasa Indonesia and the output is English,
  translate and summarise into natural English.
- Apply the same rule to all other input languages.
- Preserve the original meaning and important information.
- Keep important names, dates, facts and figures accurate.
- Do not invent information.
- Use natural grammar and fluent language.
- Do not mix languages unnecessarily.
- Return ONLY the final summary.
- Do not explain the translation process.

TEXT:
${text}
`;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const result =
    response.choices?.[0]?.message?.content;

  if (!result) {
    throw new Error("Groq returned an empty response.");
  }

  return result.trim();
}





/* PASTE TEXT */

app.post("/api/summarize", async (req, res) => {

  try {

    const {
  text,
  length = "medium",
  language = "en-US"
} = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Please provide some text."
      });
    }

    const summary =
  await generateSummary(text, length, language);

    res.json({
      summary
    });

  } catch (error) {

    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Unable to generate summary."
    });
  }
});


/* PDF */

app.post(
  "/api/summarize-pdf",
  upload.single("pdf"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          error: "Please upload a PDF."
        });
      }

      const parser = new PDFParse({
        data: req.file.buffer
      });

      const pdf = await parser.getText();

      await parser.destroy();

      const text = pdf.text.trim();



      if (!text) {
        return res.status(400).json({
          error:
            "This PDF does not contain readable text."
        });
      }

      const length =
  req.body.length || "medium";

const language =
  req.body.language || "en-US";

const summary =
  await generateSummary(text, length, language);

      res.json({
        summary,
        pages: pdf.numpages,
        characters: text.length
      });

    } catch (error) {

      console.error("PDF/Gemini error:", error);

      res.status(500).json({
        error:
          "Unable to process the PDF."
      });
    }
  }
);


/* ERRORS */

app.use((error, req, res, next) => {

  console.error(error);

  res.status(400).json({
    error: error.message || "Something went wrong."
  });

});
app.get("/api/groq-models", async (req, res) => {
  try {

    const models = await groq.models.list();

    res.json(models);

  } catch (error) {

    console.error("Groq models error:", error);

    res.status(500).json({
      error: error.message
    });

  }
});


app.listen(PORT, () => {

  console.log(
    `SummarAI running at http://localhost:${PORT}`
  );

});

