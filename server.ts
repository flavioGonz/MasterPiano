import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
});

// Chat with the Virtual Piano Instructor
app.post("/api/instructor/chat", async (req, res) => {
  try {
    const { message, lessonContext, userLevel, recentScore } = req.body;
    const ai = getAI();

    if (!ai) {
      // Graceful pedagogical fallback when no API key is set
      return res.json({
        reply: `Como tu instructor virtual de piano, te recuerdo que la clave en esta etapa (${userLevel || "Principiante"}) es mantener la relajación de hombros y muñecas. En la lección actual "${lessonContext?.title || 'Fundamentos'}", practica a tempo lento con metrónomo. ¿Qué duda específica tienes sobre las notas o la digitación?`
      });
    }

    const systemInstruction = `Eres el "Maestro Aurelio", un instructor virtual de piano de clase mundial, paciente, sumamente pedagógico, inspirador y exigente con el rigor técnico pero empático.
El alumno está aprendiendo de 0 a 100 con un currículo estructurado.
Nivel actual del alumno: ${userLevel || "Principiante desde cero"}.
Lección activa: "${lessonContext?.title || 'Fundamentos'}" (${lessonContext?.description || ''}).
Último resultado en evaluación: ${recentScore !== undefined ? `${recentScore}%` : 'Aún no evaluado'}.

Directrices pedagógicas:
1. Responde en español de forma concisa, clara, directa y muy práctica (máximo 2-3 párrafos).
2. Usa metáforas físicas útiles (por ejemplo: "como si sostuvieras una manzana o pelota de tenis", "el peso del brazo como un péndulo").
3. Si el alumno pregunta sobre notas, digitación (1=pulgar a 5=meñique), escalas o acordes, sé exacto y musicalmente impecable.
4. Anima siempre al alumno a tocar y escuchar, no solo a memorizar teoría vacía.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message || "¿Cómo puedo mejorar mi práctica hoy?",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text || "Sigue practicando con dedicación, cada tecla cuenta." });
  } catch (error: any) {
    console.error("Error in /api/instructor/chat:", error);
    res.status(500).json({
      reply: "He tenido una pequeña interferencia en el conservatorio virtual. Recuerda mantener los dedos curvados y tocar con paciencia. ¿Podrías repetirme tu consulta?",
      error: error?.message,
    });
  }
});

// Feedback generator after evaluation failure or success
app.post("/api/instructor/evaluate-feedback", async (req, res) => {
  try {
    const { lessonTitle, score, passed, errors, userNotes, expectedNotes } = req.body;
    const ai = getAI();

    if (!ai) {
      if (passed) {
        return res.json({
          feedback: `¡Excelente ejecución en "${lessonTitle}"! Has demostrado dominio técnico y precisión rítmica. Avanza a la siguiente lección manteniendo esta disciplina.`
        });
      } else {
        return res.json({
          feedback: `No te desanimes. En "${lessonTitle}", la clave está en verificar cada intervalo antes de presionar las teclas. Revisa las notas requeridas (${expectedNotes?.join(', ') || ''}) y vuelve a intentarlo despacio.`
        });
      }
    }

    const prompt = `El alumno acaba de completar la evaluación de la lección "${lessonTitle}".
Resultado: ${score}% (${passed ? 'APROBADO' : 'REPROBADO'}).
Notas esperadas: ${JSON.stringify(expectedNotes || [])}.
Notas tocadas por el alumno: ${JSON.stringify(userNotes || [])}.
Detalle de fallos o aciertos: ${JSON.stringify(errors || [])}.

Como Maestro de Piano, dale una retroalimentación en 2-3 oraciones:
- Si aprobó: Felicítalo con calidez profesional y dale un reto para la siguiente fase.
- Si reprobó: Explica exactamente qué corregir con cariño pedagógico, sin frustrarlo, y aliéntalo a repetir despacio.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.6,
      }
    });

    res.json({ feedback: response.text || "Gran esfuerzo. La repetición consciente es el secreto del virtuosismo." });
  } catch (error: any) {
    console.error("Error in /api/instructor/evaluate-feedback:", error);
    res.json({
      feedback: "Excelente esfuerzo. Escucha atentamente cada sonido y continúa tu práctica."
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Instructor Virtual Piano Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
