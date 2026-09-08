import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { registerAudioRoutes } from "./server/audioJobs";
import { registerProfileRoutes } from "./server/profiles";
import { registerAuthRoutes } from "./server/auth";
import { registerSongRoutes } from "./server/songs";
import { registerVideoRoutes } from "./server/videos";
import { registerPushRoutes } from "./server/push";
import { startRetention } from "./server/retention";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

// Helper to detect temporary or high-demand capacity issues
function isTransientError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err?.error?.code || err?.error?.status;
  const message = String(err.message || err?.error?.message || '').toLowerCase();
  return (
    status === 503 || 
    status === 'UNAVAILABLE' || 
    status === 429 || 
    message.includes('high demand') || 
    message.includes('temporarily unavailable') || 
    message.includes('rate limit') ||
    message.includes('overloaded')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Robust text generation with automatic retries and model fallbacks
async function generateTextWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  },
  defaultText: string
): Promise<string> {
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.7,
          },
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        if (isTransientError(err)) {
          if (attempt === 0) {
            await sleep(700);
            continue;
          }
          break;
        }
        console.warn(`Model ${model} request warning:`, err?.message || err);
        break;
      }
    }
  }

  return defaultText;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
});

// Audio: YouTube / archivo → stems (Demucs) → bases para el Kross 2
// El orden importa: auth primero, que deja req.user para el resto.
registerAuthRoutes(app);
registerAudioRoutes(app);
registerProfileRoutes(app);
registerSongRoutes(app);
registerVideoRoutes(app);
registerPushRoutes(app);
startRetention();

// Text-to-Speech endpoint for Maestro Aurelio (Uruguayan natural instructor voice)
app.post("/api/instructor/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid text parameter" });
    }

    const ai = getAI();
    if (!ai) {
      return res.json({ audioBase64: null, fallbackToBrowser: true, message: "No Gemini API key available" });
    }

    // Direct Gemini TTS to speak with natural Uruguayan / Rioplatense warmth and human cadence
    const prompt = `Leé el siguiente texto con tono cálido, humano, amigable, pausado y pedagógico, como el Maestro Aurelio, un querido profesor de piano de Uruguay (acento rioplatense uruguayo, muy natural, sin sonar a robot):\n\n${text}`;

    let base64Audio: string | null = null;
    let mimeType = "audio/wav";

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Fenrir" },
              },
            },
          },
        });

        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        base64Audio = part?.inlineData?.data || null;
        mimeType = part?.inlineData?.mimeType || "audio/wav";

        if (base64Audio) break;
      } catch (err: any) {
        if (isTransientError(err)) {
          if (attempt === 0) {
            await sleep(700);
            continue;
          }
          return res.json({
            audioBase64: null,
            fallbackToBrowser: true,
            notice: "TTS service experiencing high demand. Using browser voice fallback.",
          });
        }
        console.warn("TTS generation warning:", err?.message || err);
        break;
      }
    }

    if (!base64Audio) {
      return res.json({ audioBase64: null, fallbackToBrowser: true });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType,
    });
  } catch (error: any) {
    res.json({ audioBase64: null, fallbackToBrowser: true });
  }
});

// Chat with the Virtual Piano Instructor (Maestro Aurelio - Uruguay)
app.post("/api/instructor/chat", async (req, res) => {
  try {
    const { message, lessonContext, userLevel, recentScore } = req.body;
    const ai = getAI();

    const fallbackReply = `¡Buenas! Como tu maestro acá al lado del piano, acordate que la clave en esta etapa (${userLevel || "Principiante"}) es no tensionar los hombros ni las muñecas. En la lección actual "${lessonContext?.title || 'Fundamentos'}", tocá despacito con el metrónomo. ¿Qué duda tenés con las notas o la digitación, che? ¡Vamos arriba!`;

    if (!ai) {
      // Graceful Uruguayan pedagogical fallback when no API key is set
      return res.json({ reply: fallbackReply });
    }

    const systemInstruction = `Eres el "Maestro Aurelio", un queridísimo y sabio profesor de piano de Montevideo, Uruguay.
Hablas con la calidez, la calma y la pasión típica uruguaya, con un acento rioplatense inconfundible y profundamente natural (usando siempre voseo uruguayo: "mirá", "fijate", "acordate", "tenés", "tocá", "sentate derecho", "vamos arriba", "che", "dale", "impecable", "tranquilo").
Jamás suenas como un robot ni usas español neutro o acartonado. Hablas como un mentor entrañable sentado al lado de tu alumno frente al piano, transmitiendo confianza, paciencia y amor por la música.
El alumno está aprendiendo de 0 a 100 con un currículo estructurado.
Nivel actual del alumno: ${userLevel || "Principiante desde cero"}.
Lección activa: "${lessonContext?.title || 'Fundamentos'}" (${lessonContext?.description || ''}).
Último resultado en evaluación: ${recentScore !== undefined ? `${recentScore}%` : 'Aún no evaluado'}.

Directrices pedagógicas:
1. Habla en primera persona con tono rioplatense uruguayo cercano, pedagógico y muy humano (máximo 2-3 párrafos).
2. Usa metáforas físicas vivas (por ejemplo: "como si tuvieras una manzana o pelota de tenis en la mano", "el peso del brazo como un péndulo que cae libre").
3. Si el alumno pregunta sobre notas, digitación (1=pulgar a 5=meñique), escalas o acordes, sé exacto y musicalmente impecable.
4. Alentalo con calidez ("¡Vamos arriba!", "Tranqui, que esto al principio cuesta pero sale", "Metéle paciencia y dedicación").`;

    const reply = await generateTextWithFallback(
      ai,
      {
        contents: message || "¿Cómo puedo mejorar mi práctica hoy, Maestro?",
        systemInstruction,
        temperature: 0.7,
      },
      fallbackReply
    );

    res.json({ reply });
  } catch (error: any) {
    res.json({
      reply: "Che, se me entrecortó un segundo la señal acá en el conservatorio, pero no te preocupes: manos flojas, dedos curvados como agarrando una pelotita y tocá con calma. ¿Me repetís la pregunta, che?",
    });
  }
});

// Feedback generator after evaluation failure or success
app.post("/api/instructor/evaluate-feedback", async (req, res) => {
  try {
    const { lessonTitle, score, passed, errors, userNotes, expectedNotes } = req.body;
    const ai = getAI();

    const fallbackFeedback = passed
      ? `¡Impecable, che! Tremenda ejecución en "${lessonTitle}". Se nota que le estás metiendo cabeza y cariño al teclado. ¡Vamos arriba y pasemos a la siguiente lección!`
      : `Tranqui, no te bajonees que a todos nos pasa al principio. En "${lessonTitle}", la clave está en mirar bien las notas (${expectedNotes?.join(', ') || ''}) antes de tocar. Relajá la mano y dale otra vuelta despacito, que sale seguro.`;

    if (!ai) {
      return res.json({ feedback: fallbackFeedback });
    }

    const prompt = `El alumno acaba de completar la evaluación de la lección "${lessonTitle}".
Resultado: ${score}% (${passed ? 'APROBADO' : 'REPROBADO'}).
Notas esperadas: ${JSON.stringify(expectedNotes || [])}.
Notas tocadas por el alumno: ${JSON.stringify(userNotes || [])}.
Detalle de fallos o aciertos: ${JSON.stringify(errors || [])}.

Como el Maestro Aurelio (profesor de piano uruguayo, cálido, motivador, que habla con acento y expresiones de Uruguay: "¡Qué grande!", "Impecable, che", "Vamos arriba", "Fijate con calma"):
Dale una devolución en 2 o 3 oraciones en voseo uruguayo muy natural:
- Si aprobó: Felicítalo con entusiasmo sincero y desafíalo para la siguiente etapa.
- Si reprobó: Dale ánimo sincero, explicale con cariño exactamente en qué erró y decile que repita despacio sin frustrarse.`;

    const feedback = await generateTextWithFallback(
      ai,
      {
        contents: prompt,
        temperature: 0.6,
      },
      fallbackFeedback
    );

    res.json({ feedback });
  } catch (error: any) {
    res.json({
      feedback: "¡Lindo intento! Escuchá con atención cómo resuena cada nota y dale otra pasada despacio.",
    });
  }
});

async function startServer() {
  try {
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
  } catch (error) {
    console.error("Critical error starting server:", error);
    process.exit(1);
  }
}

startServer();
