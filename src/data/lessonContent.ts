/**
 * El cuerpo de cada lección: el texto, el dictado del Maestro y la evaluación.
 *
 * Vive separado de `LESSONS` por peso. La lista de lecciones la necesita
 * `App.tsx` desde el primer render —para saber qué está desbloqueado—, así que
 * viaja en el paquete inicial; el texto, en cambio, sólo hace falta cuando
 * abrís una lección. Con 45 lecciones eso eran unos 150 kB de markdown y
 * preguntas que todo el mundo descargaba para ver la portada.
 *
 * Sólo lo importan `LessonViewer` y la evaluación, que ya son diferidos: el
 * peso queda en su propio trozo y se baja al abrir la primera lección.
 */
import type { LessonEvaluation } from '../types';

export interface LessonBody {
  content: string;
  dictationScript: string;
  evaluation: LessonEvaluation;
}

export const LESSON_BODIES: Record<string, LessonBody> = {
  '1': {
  content: `
### Tu Primera Conexión con el Instrumento 

El piano no es un instrumento caótico: es pura **geometría acústica**.

#### 1. La Arquitectura de las 88 Teclas
- **52 teclas blancas** (notas naturales).
- **36 teclas negras** (sostenidos y bemoles).
- Las teclas negras están divididas en un patrón constante: **grupo de 2** seguido de **grupo de 3**.

#### 2. La Regla de Oro del DO (C)
1. Observa el teclado y localiza cualquier grupo de **dos teclas negras**.
2. Desliza tu dedo a la tecla blanca que está a su **izquierda directa**: ¡Ese es el **DO**!
3. El **Do Central (C4)** se encuentra justo en el centro del piano, enfrente de tu ombligo.

#### 3. Las Siete Hermanas
A partir de Do, las notas ascienden en orden alfabético:
**DO (C) → RE (D) → MI (E) → FA (F) → SOL (G) → LA (A) → SI (B) → DO (C)**

---
**Consejo del Maestro:**
No mires el teclado como 88 teclas individuales. Míralo como una escalera circular de 7 notas blancas y 5 negras que se repite en registros graves, medios y agudos.
    `,
  dictationScript: '¡Buenas! ¿Cómo andás? Soy Aurelio, tu maestro de piano. Mirá, a primera vista el teclado parece infinito con sus 88 teclas, pero en realidad es un patrón de apenas doce notas que se repite una y otra vez. Fijate en las teclas negras: vienen en grupitos de dos y de tres. Para encontrar el Do, buscá cualquier grupito de dos teclas negras: la tecla blanca que tenés pegadita a la izquierda es siempre un Do. Tocá los Do que encuentres para que tu oído y tu vista se vayan acostumbrando. ¡Vamos arriba!',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Dónde se encuentra ubicada la nota DO (C) en el teclado?',
          options: [
            'A la derecha del grupo de tres teclas negras',
            'Inmediatamente a la izquierda del grupo de dos teclas negras',
            'En el medio de las tres teclas negras',
            'En cualquier tecla negra'
          ],
          correctIndex: 1,
          explanation: 'Correcto. La nota Do siempre es la tecla blanca inmediatamente a la izquierda del grupo de dos teclas negras.'
        },
        {
          question: '¿Cuántas notas naturales diferentes forman la escala básica antes de repetirse en la siguiente octava?',
          options: ['12 notas', '8 notas', '7 notas (Do, Re, Mi, Fa, Sol, La, Si)', '5 notas'],
          correctIndex: 2,
          explanation: 'Son 7 notas blancas naturales (Do, Re, Mi, Fa, Sol, La, Si). La octava nota es el Do repetido más agudo.'
        }
      ],
      practicalTask: {
        instruction: 'Toca en el teclado virtual los tres DOs señalados: C3 (grave), C4 (central) y C5 (agudo).',
        requiredSequence: ['C3', 'C4', 'C5'],
        mode: 'sequence',
        hint: 'Busca las teclas blancas a la izquierda de cada grupo de dos teclas negras.'
      }
    },
  },
  '2': {
  content: `
### Biomecánica: El Secreto del Sonido Cantable 

Un sonido bello nace de la relajación corporal, no de la fuerza bruta.

#### 1. El Código Internacional de Dedos
Tanto para mano derecha como izquierda:
- **1:** Pulgar 
- **2:** Índice 
- **3:** Mayor / Medio 
- **4:** Anular 
- **5:** Meñique 

#### 2. La Forma de "Manzana" en la Mano
- Curva tus dedos suavemente. La última falange debe caer casi perpendicular a la tecla.
- El pulgar toca con su borde lateral exterior.
- La muñeca debe permanecer flexible como un amortiguador, a la misma altura del antebrazo.

#### 3. Posición de 5 Dedos (Do a Sol)
Coloca tu mano derecha:
- Dedo 1 en **C4 (Do)**
- Dedo 2 en **D4 (Re)**
- Dedo 3 en **E4 (Mi)**
- Dedo 4 en **F4 (Fa)**
- Dedo 5 en **G4 (Sol)**
    `,
  dictationScript: 'Mirá, che, la técnica no es para hacerse el virtuoso, es para tocar con libertad y no lastimarse los tendones. En el piano nos manejamos con números de dedos: el pulgar es el uno, el índice es el dos, el mayor es el tres, el anular es el cuatro y el meñique es el cinco. Poné la mano curva, como si estuvieras sosteniendo una mandarina o una pelota de tenis, y dejá que el peso del brazo caiga flojito sobre la tecla sin empujar. Sentate derecho y relajá los hombros.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la nomenclatura pianística universal, ¿a qué dedo corresponde el número 4?',
          options: ['Pulgar', 'Índice', 'Anular', 'Meñique'],
          correctIndex: 2,
          explanation: 'El dedo 4 es el anular. Es el dedo con menor independencia anatómica natural.'
        },
        {
          question: '¿Cómo debe ser la forma de los dedos sobre el teclado?',
          options: [
            'Totalmente estirados y planos',
            'Curvados naturalmente como sosteniendo una pelota o fruta pequeña',
            'Rígidos y tensionados hacia arriba',
            'Apoyando toda la palma en las teclas'
          ],
          correctIndex: 1,
          explanation: 'La curvatura natural protege los tendones y permite un ataque ágil con la yema del dedo.'
        }
      ],
      practicalTask: {
        instruction: 'Ejecuta el patrón de 5 dedos en orden ascendente: C4 (dedo 1), D4 (dedo 2), E4 (dedo 3), F4 (dedo 4) y G4 (dedo 5).',
        requiredSequence: ['C4', 'D4', 'E4', 'F4', 'G4'],
        mode: 'sequence',
        hint: 'Toca cada nota consecutivamente con articulación limpia.'
      }
    },
  },
  '2b': {
  content: `
### El 4º dedo no es débil: está atado

Poné la mano abierta sobre la mesa y levantá el anular sin mover ningún otro. Casi no sube, y el del medio se viene con él. No es falta de músculo: el anular comparte tendones con el 3º y el 5º, y no tiene un extensor propio como los demás. Eso no se entrena a fuerza de fuerza. Se entrena con **control**: aprender a mover uno mientras los otros se quedan quietos.

Por eso todos los métodos —Hanon el primero— empiezan por acá. Y por eso el ejercicio que más rinde es el que menos parece un ejercicio.

#### 1. Notas tenidas (el que más rinde)

Posición de cinco dedos sobre Do-Re-Mi-Fa-Sol.

- Hundí y **sostené** Do, Re, Mi y Sol con el 1, 2, 3 y 5.
- Con esas cuatro abajo, tocá el **Fa con el 4** cinco veces, parejo.
- Cambiá el dedo que se mueve y repetí. El 4 es el que cuesta; el 3 también.

Regla: las teclas sostenidas **no se pueden soltar** ni volver a hundir. Si se te escapan, andá más lento. Es preferible una repetición limpia que diez con trampa.

#### 2. Levantar sin empujar

Mismo apoyo, pero ahora el dedo que trabaja **se levanta** en vez de tocar. Sostené las cinco teclas y levantá sólo el 4, dos centímetros, sin que se mueva la mano ni suenen las otras.

Esto entrena el extensor, que es la mitad que nadie practica: tocar el piano es tanto **soltar** como bajar.

#### 3. Pares de dedos

Tocá dos notas a la vez con pares distintos: 1-2, 2-3, 3-4, 4-5, y después salteados: 1-3, 2-4, 3-5, 1-5.

Buscá que las dos suenen **exactamente juntas y con el mismo volumen**. El par 4-5 va a salir desparejo las primeras semanas: ese es el dato, no el fracaso.

#### 4. La dosis, y el límite

- **Tres a cinco minutos por día.** No más. Es control, no resistencia.
- **Lento.** Este trabajo no tiene versión rápida.
- **Si duele, se para.** Ni un poquito. Las lesiones de mano en pianistas casi siempre salen de estirar o forzar el 4º dedo. Nada de aparatos para "fortalecer dedos": la literatura los asocia a lesiones, no a mejoras.
- Se hace **antes** de tocar, con la mano tibia, no al final cuando ya estás cansado.

#### 5. Qué esperar

A las dos semanas el 4 no va a ser más fuerte: va a estar **más suelto**, que es lo que hace falta. Lo vas a notar primero en las escalas, donde el 4 aparece una sola vez por octava y suele ser el que se traba.
    `,
  dictationScript: 'Che, hay algo que tenés que saber antes de frustrarte: el cuarto dedo no es débil, está atado. Comparte tendones con el tercero y con el quinto, y por eso cuando querés levantarlo solo, el del medio se viene con él. No es falta de fuerza, es anatomía. Y la buena noticia es que no se arregla con fuerza sino con control: sostener las otras notas mientras una sola se mueve. Tres minutos por día de eso rinden más que media hora de repetir escalas rápido. Y ojo con una cosa: si te duele, parás. Acá no se estira nada, se suelta.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Por qué el 4º dedo se mueve peor que los demás?',
          options: [
            'Porque tiene menos músculo y hay que fortalecerlo',
            'Porque comparte tendones con el 3º y el 5º y no tiene extensor propio',
            'Porque es más corto',
            'Porque se usa menos en el piano'
          ],
          correctIndex: 1,
          explanation: 'Es una cuestión anatómica, no de fuerza. Por eso el trabajo es de control —mover uno mientras los otros se quedan quietos— y no de fortalecimiento.'
        },
        {
          question: 'Estás haciendo notas tenidas y sentís una molestia en el dorso de la mano. ¿Qué hacés?',
          options: [
            'Seguís: hay que pasar la molestia para ganar fuerza',
            'Parás en el acto y volvés otro día, más lento',
            'Cambiás a la otra mano y seguís igual',
            'Usás un aparato de fortalecer dedos'
          ],
          correctIndex: 1,
          explanation: 'Con las manos no se negocia. La molestia es la señal de que estás forzando, y las lesiones de pianista salen casi siempre de insistir ahí. Los aparatos de fortalecimiento están asociados a lesiones, no a mejoras.'
        }
      ],
      practicalTask: {
        instruction: 'Poné la posición de cinco dedos y tocá Do, Re, Mi, Fa, Sol uno por uno, parejo y lento, con los dedos 1 a 5.',
        requiredSequence: ['C4', 'D4', 'E4', 'F4', 'G4'],
        mode: 'sequence',
        hint: 'Que las cinco suenen con el mismo volumen. La que se destaque o la que quede floja te dice qué dedo trabajar.'
      }
    },
  },
  '3': {
  content: `
### El Ritmo: La Fuerza Vital 

La música existe en el tiempo. Si dominas el tiempo, dominas la atención del oyente.

#### 1. El Compás de 4/4 (Cuatro Cuartos)
Es el compás más utilizado en la música moderna y clásica. Cada compás contiene **4 pulsos de negra**:
**| 1 - 2 - 3 - 4 | 1 - 2 - 3 - 4 |**

#### 2. Jerarquía de Figuras Rítmicas
- **Redonda:** Vale **4 pulsos**. La tocas en el 1 y la sostienes hasta el 4.
- **Blanca:** Vale **2 pulsos**. En un compás caben dos blancas (pulsos 1 y 3).
- **Negra:** Vale **1 pulso**. Tocas una nota en cada golpe del metrónomo.
- **Corcheas:** Dos notas por pulso ("y-un, y-dos, y-tres, y-cua").

#### 3. El Metrónomo es tu Mejor Amigo
Empieza siempre lento: a **60 BPM** (un golpe por segundo). No aumentes la velocidad hasta que no tengas precisión milimétrica.
    `,
  dictationScript: 'Mirá que las notas sin ritmo no dicen nada, che. El pulso es el corazón de la música, ese latido constante que te hace mover el pie sin darte cuenta. En un compás de cuatro cuartos contamos parejito: uno, dos, tres, cuatro. Una redonda dura cuatro tiempos enteros. Una blanca dura dos. Y una negra dura un pulso. Vamos a tocar sintiendo el ritmo en el cuerpo, bien acompasado. Dale, metéle ganas.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En un compás estándar de 4/4, ¿cuántos tiempos dura una figura Blanca?',
          options: ['1 tiempo', '2 tiempos', '4 tiempos', 'Medio tiempo'],
          correctIndex: 1,
          explanation: 'La blanca equivale a 2 tiempos (pulsos). Dos blancas completan un compás de 4/4.'
        },
        {
          question: 'Si una canción está a 60 BPM (beats por minuto), ¿cuánto dura cada pulso de negra?',
          options: ['Exactamente 1 segundo', '2 segundos', 'Medio segundo', '10 segundos'],
          correctIndex: 0,
          explanation: '60 pulsos en 60 segundos equivale a 1 pulso por segundo.'
        }
      ],
      practicalTask: {
        instruction: 'Toca la secuencia de notas Do-Mi-Sol-Do agudo (C4, E4, G4, C5) manteniendo un pulso constante y regular.',
        requiredSequence: ['C4', 'E4', 'G4', 'C5'],
        mode: 'sequence',
        hint: 'Toca cada nota con espacio regular entre ellas.'
      }
    },
  },
  '4': {
  content: `
### La Geometría de los Intervalos 

Los intervalos son los ladrillos con los que se construye cualquier melodía o acorde.

#### 1. El Semitono (Medio Tono)
Es la distancia más pequeña entre dos teclas vecinas inmediatas:
- De **Do a Do#**: 1 semitono.
- De **Mi a Fa**: ¡1 semitono natural! (porque no hay tecla negra en medio).
- De **Si a Do**: ¡1 semitono natural!

#### 2. El Tono Entero (T)
Un Tono equivale a **2 semitonos** (saltando una tecla intermedia):
- De **Do a Re**: 1 Tono (salta la tecla negra C#).
- De **Fa a Sol**: 1 Tono.

#### 3. La Fórmula Mágica de la Escala Mayor
Desde cualquier nota raíz, aplica esta fórmula:
**TONO – TONO – SEMITONO – TONO – TONO – TONO – SEMITONO**
*(T - T - S - T - T - T - S)*
    `,
  dictationScript: 'Fijate que toda la música se construye sobre dos distancias básicas: el semitono y el tono. El semitono es la distancia más cortita entre dos teclas pegadas del piano, sean blancas o negras. Por ejemplo, de Mi a Fa tenés un semitono natural porque no hay tecla negra en el medio. Un tono entero son dos semitonos. Con la fórmula mágica: tono, tono, semitono, tono, tono, tono, semitono, armás la escala mayor de cualquier nota que se te ocurra. Mirá qué belleza.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Entre qué par de teclas blancas consecutivas existe una distancia natural de 1 SEMITONO?',
          options: ['Do y Re', 'Fa y Sol', 'Mi y Fa', 'Sol y La'],
          correctIndex: 2,
          explanation: 'Entre Mi y Fa (y entre Si y Do) no hay tecla negra intermedia, por lo que la distancia es de un semitono directo.'
        },
        {
          question: '¿Cuál es la fórmula interválica para construir cualquier Escala Mayor?',
          options: [
            'Tono - Semitono - Tono - Tono - Semitono - Tono - Tono',
            'Tono - Tono - Semitono - Tono - Tono - Tono - Semitono',
            'Semitono - Tono - Tono - Semitono - Tono - Tono - Tono',
            'Tono - Tono - Tono - Tono - Tono - Tono - Semitono'
          ],
          correctIndex: 1,
          explanation: 'T-T-S-T-T-T-S es la fórmula de la escala mayor diatónica.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el primer tetracordio de Do Mayor comprobando los intervalos (T-T-S): C4 (Tono) D4 (Tono) E4 (Semitono) F4.',
        requiredSequence: ['C4', 'D4', 'E4', 'F4'],
        mode: 'sequence',
        hint: 'Escucha cómo la distancia entre E4 y F4 suena más estrecha que las anteriores.'
      }
    },
  },
  '4b': {
  content: `
### Toda la armonía empieza acá

Un acorde es un puñado de intervalos apilados. Una escala es una fila de intervalos. Una melodía es una sucesión de intervalos. Si medís bien, después todo se explica solo.

#### 1. Dos apellidos: número y calidad

- **El número** se cuenta sobre los *nombres* de las notas, incluyendo las dos puntas. De Do a Sol: Do-Re-Mi-Fa-Sol = **cinco** nombres → una **quinta**.
- **La calidad** se cuenta en *semitonos*, y es lo que le da el color: mayor, menor, justa, aumentada, disminuida.

Contar el número mal es el error más común: se cuentan los *pasos* en vez de los *nombres*. De Do a Re hay un paso, pero es una **segunda**, no una primera.

#### 2. La tabla que conviene saber de memoria

| Semitonos | Intervalo | Referencia para el oído |
|---|---|---|
| 0 | Unísono justo | la misma tecla |
| 1 | Segunda menor | *Tiburón* |
| 2 | Segunda mayor | *Cumpleaños feliz* (las dos primeras) |
| 3 | Tercera menor | *Para Elisa* (el giro Mi–Re♯ no; el salto de la campana sí) |
| 4 | Tercera mayor | *Oh when the saints* |
| 5 | Cuarta justa | *La marcha nupcial* |
| 6 | Tritono | *Los Simpsons* |
| 7 | Quinta justa | *Star Wars* |
| 8 | Sexta menor | *Love Story* |
| 9 | Sexta mayor | *NBC* |
| 10 | Séptima menor | *Somewhere* (West Side Story) |
| 11 | Séptima mayor | *Take on me* (el estribillo) |
| 12 | Octava justa | *Somewhere over the rainbow* |

#### 3. Justos y mayores: por qué no todos se llaman igual

La unísono, la cuarta, la quinta y la octava son **justas**: suenan tan estables que no admiten "mayor" ni "menor". El resto —segundas, terceras, sextas y séptimas— viene en **mayor** y **menor**. Bajá un semitono un intervalo mayor y se vuelve menor; bajá un semitono uno justo y se vuelve **disminuido**.

#### 4. El truco de la mano

Poné el pulgar en la nota de abajo y el meñique en la de arriba, sin mover la mano. La **forma de la mano** es la que aprendés: una quinta justa se siente en la palma abierta, una tercera se siente cerrada. Con el tiempo reconocés el intervalo por el cuerpo antes que por la cuenta.
    `,
  dictationScript: 'Un intervalo tiene dos apellidos, che, y hay que decir los dos. El número se cuenta con los dedos sobre los nombres de las notas: de Do a Mi hay tres nombres, Do, Re, Mi, entonces es una tercera. La calidad se cuenta en semitonos: de Do a Mi hay cuatro semitonos, tercera mayor; de Do a Mi bemol hay tres, tercera menor. Mismo número, distinto color. Y para reconocerlos de oído usá canciones que ya tenés en la cabeza: el cumpleaños feliz empieza con una segunda mayor, y el Himno a la Alegría sube de a segundas.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'De Do a Sol, ¿qué intervalo hay?',
          options: ['Cuarta justa', 'Quinta justa', 'Sexta mayor', 'Quinta disminuida'],
          correctIndex: 1,
          explanation: 'Do-Re-Mi-Fa-Sol son cinco nombres (quinta) y siete semitonos (justa). La quinta justa es el intervalo más estable después de la octava: es lo que sostiene todo acorde mayor y menor.'
        },
        {
          question: '¿Qué diferencia hay entre una tercera mayor y una tercera menor?',
          options: [
            'El número de nombres que abarcan',
            'Un semitono: la mayor tiene 4 y la menor 3',
            'La mayor se toca con la derecha y la menor con la izquierda',
            'Ninguna, son dos nombres para lo mismo'
          ],
          correctIndex: 1,
          explanation: 'Las dos abarcan tres nombres de nota; cambia la distancia en semitonos. Ese único semitono es lo que separa un acorde mayor de uno menor.'
        }
      ],
      practicalTask: {
        instruction: 'Sobre Do central, tocá la tercera mayor, después la quinta justa y por último la octava.',
        requiredSequence: ['E4', 'G4', 'C5'],
        mode: 'sequence',
        hint: 'Cuatro semitonos, siete semitonos y doce semitonos arriba de Do.'
      }
    },
  },
  '5': {
  content: `
### La Escala Madre: Do Mayor 

La escala de Do Mayor no contiene ninguna tecla negra, lo que la convierte en el laboratorio perfecto para entrenar la articulación.

#### 1. Las 8 Notas de la Escala
**C (Do) - D (Re) - E (Mi) - F (Fa) - G (Sol) - A (La) - B (Si) - C (Do)**

#### 2. La Digitación Estándar (Mano Derecha)
- **C4:** Dedo 1 (Pulgar)
- **D4:** Dedo 2 (Índice)
- **E4:** Dedo 3 (Medio)
- **→ ¡PASO DEL PULGAR POR DEBAJO! ←**
- **F4:** Dedo 1 (Pulgar pasa por debajo de la mano)
- **G4:** Dedo 2
- **A4:** Dedo 3
- **B4:** Dedo 4
- **C5:** Dedo 5 (Meñique final)

#### 3. Regla de Oro del Paso del Pulgar
No levantes el codo de golpe. El pulgar debe comenzar a deslizarse hacia adentro mientras el dedo 2 y 3 están tocando, con un movimiento fluido y silencioso.
    `,
  dictationScript: 'Mirá qué detalle curioso: tenemos solo cinco dedos en la mano, pero las escalas tienen siete notas y el teclado sigue de largo. ¿Cómo hacemos? Con el paso del pulgar, che. Tocás con la derecha los dedos uno, dos, tres, y apenas el tres toca el Mi, pasás el pulgar suavecito por abajo de la palma para tocar el Fa con el uno. Es el movimiento madre del piano clásico. Relajá la muñeca y practicalo con paciencia.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la escala ascendente de Do Mayor con mano derecha, ¿después de qué nota pasa el pulgar por debajo?',
          options: ['Después de Sol (G)', 'Después de Mi (E)', 'Después de Do (C)', 'Al llegar a Si (B)'],
          correctIndex: 1,
          explanation: 'El pulgar pasa por debajo después de tocar Mi con el dedo 3, colocándose directamente sobre el Fa.'
        },
        {
          question: '¿Qué digitación completa se utiliza para tocar una octava de la escala de Do Mayor con mano derecha?',
          options: ['1-2-3-4-5-1-2-3', '1-2-3-1-2-3-4-5', '1-1-2-2-3-3-4-5', '5-4-3-2-1-3-2-1'],
          correctIndex: 1,
          explanation: '1-2-3-1-2-3-4-5 es la digitación clásica universal para la escala mayor con mano derecha.'
        }
      ],
      practicalTask: {
        instruction: 'Toca la escala completa de Do Mayor (C4 a C5) en orden ascendente.',
        requiredSequence: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
        mode: 'sequence',
        hint: 'Visualiza el cruce de pulgar entre E4 y F4.'
      }
    },
  },
  '5b': {
  content: `
### Doce escalas, cinco formas de mano

Memorizar las doce escalas nota por nota es un mal negocio: son 84 notas sueltas. La memoria motora no guarda notas, guarda **grupos**. Y agrupadas, las doce escalas mayores se reducen a **cinco digitaciones**.

#### 1. Las dos leyes que valen para las doce

- **El pulgar nunca pisa una tecla negra.** Es corto: si sube a una negra, la mano se tuerce y el paso del pulgar se traba. Esta única ley explica casi todas las digitaciones "raras".
- **Los dedos largos prefieren las negras.** El 2, el 3 y el 4 llegan cómodos al fondo del teclado; el pulgar y el meñique se quedan adelante, en las blancas.

#### 2. El faro: el 4º dedo

El **4º dedo aparece una sola vez por octava** en cada mano. Es el punto de anclaje: si sabés dónde cae el 4, la digitación entera se reconstruye sola.

| Mano derecha | Dónde cae el 4º dedo |
|---|---|
| Do, Sol, Re, La, Mi, Si | Sobre la **sensible** (el 7º grado): Si, Fa#, Do#, Sol#, Re#, La# |
| Fa, Sib, Mib, Lab, Reb, Solb | Siempre sobre **Si♭**. Las seis. Sin excepción. |

Ese segundo renglón es de las cosas más útiles del piano: en todo el lado de los bemoles, tu 4º dedo derecho vive en Si♭.

#### 3. Las cinco familias

| Familia | Escalas | Mano derecha | Mano izquierda |
|---|---|---|---|
| **1. Do** | Do, Sol, Re, La, Mi | 1 2 3 1 2 3 4 5 | 5 4 3 2 1 3 2 1 |
| **2. Fa** | Fa | 1 2 3 4 1 2 3 4 | 5 4 3 2 1 3 2 1 |
| **3. Si** | Si | 1 2 3 1 2 3 4 5 | 4 3 2 1 4 3 2 1 |
| **4. Negras** | Reb, Mib, Lab, Sib | el 4 en Si♭ | 3 2 1 4 3 2 1 |
| **5. Solb** | Solb / Fa# | 2 3 4 1 2 3 1 | 4 3 2 1 3 2 1 |

Cinco escalas comparten una sola forma en las dos manos (familia Do). Cuatro más comparten la mano izquierda (familia Negras). No son doce problemas: son cinco.

#### 4. Por qué Chopin empezaba por Si mayor

Chopin hacía arrancar a sus alumnos por **Si mayor** con la derecha y **Reb mayor** con la izquierda, no por Do. Su razón sigue siendo válida:

- Las negras acomodan solos los dedos largos: la mano cae en su forma natural, con la muñeca en línea.
- **El pulgar pasa más fácil por debajo de una tecla negra** que entre dos blancas.
- Do mayor es todo blanco y todo parejo: no tiene relieve para orientar la mano. Sonar *parejo* en Do mayor es de lo más difícil que hay, no de lo más fácil.

Do mayor es la escala más fácil de **entender** y una de las más difíciles de **tocar bien**. Aprendela igual, pero no la uses de vara.
    `,
  dictationScript: 'Escuchame bien porque esto te ahorra meses. Nadie memoriza doce escalas nota por nota; los pianistas memorizan formas de mano. Y hay solo cinco. Dos leyes valen para las doce: el pulgar nunca pisa una tecla negra, y los dedos largos, el dos, el tres y el cuatro, prefieren las negras. Después está el faro: el cuarto dedo aparece una sola vez por octava. Si sabés dónde cae el cuatro, sabés la escala entera. Y una perla: Chopin no empezaba por Do mayor, empezaba por Si mayor. Do mayor es todo blanco, todo igual, no tiene relieve. Si mayor acomoda sola la mano.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la mano derecha, ¿sobre qué nota cae el 4º dedo en TODAS las escalas mayores del lado de los bemoles (Fa, Sib, Mib, Lab, Reb, Solb)?',
          options: ['Sobre la tónica', 'Sobre Si bemol, en las seis', 'Sobre la sensible', 'Cambia en cada escala'],
          correctIndex: 1,
          explanation: 'Las seis escalas con bemoles ponen el 4º dedo derecho en Si♭. Es un solo dato que resuelve media docena de digitaciones.'
        },
        {
          question: '¿Por qué Chopin hacía empezar por Si mayor y no por Do mayor?',
          options: [
            'Porque Si mayor tiene menos notas',
            'Porque las teclas negras acomodan los dedos largos y el pulgar pasa mejor por debajo de una negra',
            'Porque Do mayor no se usa en el repertorio',
            'Porque Si mayor se toca solo con la mano derecha'
          ],
          correctIndex: 1,
          explanation: 'Si mayor pone los dedos largos sobre las negras y deja pulgar y meñique en las blancas: la mano cae en su forma natural. Do mayor, todo blanco y parejo, no tiene relieve que oriente la mano.'
        },
        {
          question: '¿Cuál es la ley que explica casi todas las digitaciones de escalas?',
          options: ['El meñique nunca toca dos veces', 'El pulgar nunca pisa una tecla negra', 'Siempre se empieza con el 3', 'Las manos usan siempre el mismo dedo'],
          correctIndex: 1,
          explanation: 'El pulgar es corto: apoyarlo en una negra tuerce la mano y traba el pasaje. De ahí salen las digitaciones "raras" de las escalas con muchas alteraciones.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá las primeras cinco notas de Si mayor con la mano derecha: Si, Do#, Re#, Mi, Fa# (dedos 1-2-3-1-2).',
        requiredSequence: ['B4', 'C#5', 'D#5', 'E5', 'F#5'],
        mode: 'sequence',
        hint: 'Pulgar en Si, y el pulgar vuelve a pasar en Mi. Los dedos largos se quedan arriba, sobre las negras.'
      }
    },
  },
  '5e': {
  content: `
### Una tonalidad, tres versiones

La escala mayor es una sola. La menor viene en tres, y no es un capricho de la teoría: cada una resuelve un problema distinto.

#### 1. Menor natural — la relativa

Es la escala mayor **empezada desde el sexto grado**. La menor natural de La usa exactamente las mismas teclas que Do mayor: todas blancas. Su fórmula, en tonos (T) y semitonos (S):

**T – S – T – T – S – T – T**

Suena antigua y abierta. Es la de casi todo el folclore y buena parte del rock.

#### 2. Menor armónica — la que arma la dominante

Problema de la natural: el séptimo grado está a un tono de la tónica, y a un tono de distancia no "tira". Sin esa tracción, el acorde de dominante sale menor y la cadencia queda floja.

Solución: **subir medio tono el séptimo grado**. En La menor, el Sol pasa a Sol♯. Aparece la **sensible**, el acorde de Mi se vuelve Mayor, y la resolución Mi → Lam suena como tiene que sonar.

Efecto colateral: entre el sexto (Fa) y el séptimo (Sol♯) queda un salto de **segunda aumentada**, tres semitonos. Es ese giro "español" o "de Medio Oriente" que reconocés al toque.

#### 3. Menor melódica — la de las melodías

Ese salto de segunda aumentada es hermoso como color, pero incómodo de cantar. La melódica lo evita **subiendo también el sexto grado**, pero solo **al subir**. Al bajar vuelve a ser natural, porque bajando ya no hace falta empujar hacia ningún lado.

| | Grados 6 y 7 subiendo | Grados 6 y 7 bajando |
|---|---|---|
| Natural | ♮6 ♮7 | ♮6 ♮7 |
| Armónica | ♮6 ♯7 | ♮6 ♯7 |
| Melódica | ♯6 ♯7 | ♮6 ♮7 |

#### 4. Cómo se estudia sin volverse loco

Elegí **una** tonalidad menor y hacé las tres seguidas: natural, armónica, melódica. Escuchá el cambio de clima entre una y otra; lo que fija no es la digitación sino el oído reconociendo qué versión está sonando.
    `,
  dictationScript: 'La escala menor no es una, son tres, y la diferencia está toda en el final. La natural es la escala mayor con el tercero, el sexto y el séptimo grado bajados: suena antigua, modal, como el folclore. La armónica sube de nuevo el séptimo grado y eso arma la sensible, esa nota que tira hacia la tónica con fuerza: es la que te da el acorde de dominante mayor y el sabor español de ese salto de segunda aumentada. Y la melódica sube el sexto y el séptimo cuando va para arriba, para que ese salto raro no moleste en una melodía, y baja natural cuando vuelve. Regla vieja: subiendo, melódica; bajando, natural.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué cambia la menor armónica respecto de la natural?',
          options: [
            'Sube medio tono el 3er grado',
            'Sube medio tono el 7º grado y crea la sensible',
            'Baja el 5º grado',
            'Nada: cambia solo la digitación'
          ],
          correctIndex: 1,
          explanation: 'Al subir el 7º grado aparece la sensible, a medio tono de la tónica. Eso convierte el acorde de V en Mayor y le devuelve fuerza a la cadencia.'
        },
        {
          question: '¿Por qué la escala menor melódica baja distinto de como sube?',
          options: [
            'Por una convención sin razón musical',
            'Porque al bajar no hace falta empujar hacia la tónica, y el 6º y 7º subidos sonarían fuera de lugar',
            'Porque la mano izquierda no llega',
            'Porque en realidad no baja nunca'
          ],
          correctIndex: 1,
          explanation: 'El 6º y 7º subidos existen para conducir hacia la tónica. Bajando esa función desaparece, así que la escala vuelve a la forma natural.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá la escala de La menor armónica ascendente: La, Si, Do, Re, Mi, Fa, Sol♯, La.',
        requiredSequence: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4', 'A4'],
        mode: 'sequence',
        hint: 'Todas blancas menos la anteúltima: el Sol va sostenido.'
      }
    },
  },
  '5f': {
  content: `
### Dejar de contar alteraciones

La armadura no es una lista de accidentes: es el **nombre de la tonalidad escrito en clave**. Y se lee de un vistazo si sabés dos frases.

#### 1. El orden nunca cambia

- **Sostenidos:** Fa – Do – Sol – Re – La – Mi – Si
- **Bemoles:** Si – Mi – La – Re – Sol – Do – Fa

Son la misma lista leída en las dos direcciones. Cada nueva alteración se suma a las anteriores: si hay tres sostenidos, son sí o sí Fa♯, Do♯ y Sol♯.

#### 2. Los dos trucos de lectura

**Con sostenidos:** mirá el **último** sostenido y subí **medio tono**.
Tres sostenidos → el último es Sol♯ → medio tono arriba es **La mayor**.

**Con bemoles:** el **anteúltimo** bemol *es* el nombre de la tonalidad.
Cuatro bemoles (Si♭, Mi♭, La♭, Re♭) → el anteúltimo es La♭ → **La♭ mayor**.
(La única que hay que memorizar suelta es **Fa mayor**, con un solo bemol.)

#### 3. Mayor o menor: la misma armadura para dos

Cada armadura sirve para una tonalidad mayor y su **relativa menor**, que está una tercera menor abajo. Tres sostenidos son La mayor **o** Fa♯ menor. ¿Cuál de las dos? Lo dice la música, no la armadura: mirá la primera y la última nota del bajo, y qué acorde suena a "casa".

#### 4. Por qué esto acelera todo

Cuando ves la armadura y decís "La mayor" en vez de "Fa♯, Do♯, Sol♯", tu cabeza deja de traducir nota por nota y empieza a leer **grados**. Ahí es donde la lectura a primera vista se vuelve rápida: ya sabés qué teclas negras te esperan antes de tocar la primera nota.
    `,
  dictationScript: 'Las alteraciones al principio del pentagrama no están puestas al azar: siempre entran en el mismo orden. Los sostenidos van Fa, Do, Sol, Re, La, Mi, Si. Y los bemoles, exactamente al revés: Si, Mi, La, Re, Sol, Do, Fa. Con eso ya tenés dos trucos que valen oro. Con sostenidos, mirá el último y subí medio tono: ahí está la tónica. Con bemoles, mirá el anteúltimo: ese es el nombre de la tonalidad, listo, no hay que contar nada.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'Una partitura tiene tres sostenidos en la armadura. ¿En qué tonalidad mayor está?',
          options: ['Mi mayor', 'La mayor', 'Re mayor', 'Fa♯ mayor'],
          correctIndex: 1,
          explanation: 'Con tres sostenidos el último es Sol♯; medio tono arriba está La. También podría ser su relativa menor, Fa♯ menor.'
        },
        {
          question: '¿Cuál es el orden de los bemoles en la armadura?',
          options: [
            'Fa, Do, Sol, Re, La, Mi, Si',
            'Si, Mi, La, Re, Sol, Do, Fa',
            'Do, Re, Mi, Fa, Sol, La, Si',
            'Depende de la tonalidad'
          ],
          correctIndex: 1,
          explanation: 'Es el orden de los sostenidos leído al revés. Por eso una sola lista, en dos direcciones, cubre las dos familias.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá los cuatro primeros sostenidos en su orden de armadura, en cualquier octava: Fa, Do, Sol, Re.',
        requiredSequence: ['F4', 'C5', 'G4', 'D5'],
        mode: 'sequence',
        hint: 'Fa – Do – Sol – Re. Cada uno está una quinta arriba del anterior.'
      }
    },
  },
  '5g': {
  content: `
### Las mismas siete notas, siete centros

Tocá solo teclas blancas de Do a Do y tenés Do mayor. Tocá solo teclas blancas de **Re a Re** y no tenés Do mayor "empezando de otro lado": tenés otra escala, con otro centro de gravedad y otro color. Eso es un modo.

#### 1. Los siete, desde las blancas

| Empezás en | Modo | Se parece a | La nota que lo delata |
|---|---|---|---|
| Do | **Jónico** | mayor | (es la mayor) |
| Re | **Dórico** | menor | 6ª mayor — menor "con esperanza" |
| Mi | **Frigio** | menor | ♭2 — tensión española |
| Fa | **Lidio** | mayor | ♯4 — flota, cine |
| Sol | **Mixolidio** | mayor | ♭7 — blues, rock |
| La | **Eólico** | menor | (es la menor natural) |
| Si | **Locrio** | ninguno | ♭5 — inestable, casi no se usa |

#### 2. La nota característica es todo

No memorices siete escalas: memorizá **qué le cambia cada modo a la mayor o a la menor**.

- Dórico = menor **con el 6º subido**.
- Frigio = menor **con el 2º bajado**.
- Lidio = mayor **con el 4º subido**.
- Mixolidio = mayor **con el 7º bajado**.

Cuatro datos y tenés los cuatro modos que se usan de verdad.

#### 3. Cómo se oye el centro

Un modo no aparece por tocar la escala: aparece cuando el **bajo insiste** en la tónica del modo. Tocá un Re grave sostenido con la izquierda y improvisá con teclas blancas arriba: vas a oír dórico, no Do mayor. Sacá el Re y todo vuelve a sonar a Do.

Por eso los modos se practican con **pedal de tónica**: una nota grave que no se mueve mientras la derecha pasea.

#### 4. Dónde los vas a escuchar

- **Dórico** — *Scarborough Fair*, casi todo el funk menor.
- **Mixolidio** — *Sweet Home Alabama*, el blues entero.
- **Lidio** — las bandas de sonido de aventura; ese salto que suena a "algo grande está por pasar".
- **Frigio** — flamenco, metal.
    `,
  dictationScript: 'Mirá qué economía: con las teclas blancas ya tenés siete escalas distintas. Si empezás en Re y llegás hasta Re, todo blanco, eso es dórico y suena a menor pero con una luz rara en el sexto grado. Si empezás en Sol, es mixolidio, el modo del blues y del rock. Si empezás en Fa, es lidio, ese cuarto grado subido que suena a banda de sonido. Las mismas teclas, distinta gravedad. Y ahí está el secreto: lo que define el modo no son las notas, es cuál de ellas mandás a ser el centro.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué le cambia el modo dórico a la escala menor natural?',
          options: ['Sube el 6º grado', 'Baja el 2º grado', 'Sube el 7º grado', 'Baja el 5º grado'],
          correctIndex: 0,
          explanation: 'El dórico es una menor con la 6ª mayor. Ese grado es el que le da ese aire menos sombrío que la menor natural.'
        },
        {
          question: 'Tocando solo teclas blancas, ¿qué hace que suene dórico y no Do mayor?',
          options: [
            'Tocar más rápido',
            'Que el bajo insista en Re como centro',
            'Usar la mano izquierda',
            'Nada: son la misma escala y suenan igual'
          ],
          correctIndex: 1,
          explanation: 'El modo lo define el centro de gravedad, no el conjunto de notas. Sin un bajo que fije la tónica del modo, el oído vuelve a escuchar Do mayor.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el modo dórico de Re, solo teclas blancas, de Re a Re.',
        requiredSequence: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'],
        mode: 'sequence',
        hint: 'Ocho blancas seguidas desde Re. Prestá atención al Si: ese es el 6º grado mayor que define el modo.'
      }
    },
  },
  '5h': {
  content: `
### Cinco notas, cero errores

La pentatónica se llama así por sus cinco notas. Lo importante no es cuántas tiene, sino **cuáles le sacaron**: las dos que generan los choques.

#### 1. Pentatónica mayor

Escala mayor **menos el 4º y el 7º grado**.
En Do: **Do – Re – Mi – Sol – La**.

Esos dos grados eran los que formaban el tritono con el resto. Sin ellos no queda ninguna disonancia fuerte: por eso cualquier nota cae bien sobre cualquier acorde de la tonalidad. Es la escala de las canciones infantiles, del folclore de medio mundo y de casi todo solo de rock.

#### 2. Pentatónica menor

Las mismas cinco notas empezando desde la **relativa menor**.
En La menor: **La – Do – Re – Mi – Sol**.

Misma digitación mental, otro centro. Si sabés la mayor, la menor te salió gratis.

#### 3. La blue note

Agregale a la pentatónica menor el **5º grado bajado** (en La menor: Mi♭) y tenés la **escala de blues**: seis notas.

Esa nota no se queda: se **pasa por arriba**. Sube de Re a Mi♭ y de Mi♭ a Mi, o baja al revés. Sola, en tiempo fuerte y sostenida, suena a error; de paso, es el sonido del blues entero.

#### 4. El regalo de las teclas negras

Las cinco teclas negras son **exactamente** una pentatónica mayor de Sol♭ (o menor de Mi♭). Poné un bajo de Mi♭ o Sol♭ con la izquierda y paseá con la derecha por las negras nada más: no existe la nota equivocada. Es el mejor primer ejercicio de improvisación que hay, y funciona desde el día uno.

#### 5. Cómo practicarla para que sirva

Tocarla de punta a punta enseña poco. Lo que sirve:

1. **Grupos de tres** — sube de a tres notas y volvé una.
2. **Saltos** — salteá una nota de la escala en vez de ir seguido.
3. **Frases de cuatro tiempos** — tocá dos tiempos y callate dos. El silencio es la mitad de un solo.
    `,
  dictationScript: 'Te doy la escala más agradecida que existe. Agarrá la escala mayor y sacale el cuarto y el séptimo grado: te quedan cinco notas, y esas cinco no chocan con nada. Eso es la pentatónica mayor. Su versión menor son las mismas cinco empezando desde el sexto grado. Y si querés blues, metele una nota más: la blue note, el quinto grado bajado, esa que suena sucia y hermosa. Probá esto: tocá solo las teclas negras. Son una pentatónica entera. No hay forma de sonar mal.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué grados se le sacan a la escala mayor para armar la pentatónica mayor?',
          options: ['El 2º y el 6º', 'El 4º y el 7º', 'El 3º y el 5º', 'El 5º y el 6º'],
          correctIndex: 1,
          explanation: 'El 4º y el 7º son los que forman el tritono de la tonalidad. Sin ellos no quedan choques fuertes y cualquier nota suena bien.'
        },
        {
          question: '¿Cómo se usa bien la blue note (5º bemol)?',
          options: [
            'Sosteniéndola largo en el tiempo fuerte',
            'Como nota de paso, entrando y saliendo rápido',
            'Solo en la mano izquierda',
            'Como nota final de la frase'
          ],
          correctIndex: 1,
          explanation: 'La blue note es tensión de paso. Sostenida en tiempo fuerte suena a error; de paso, entre el 4º y el 5º, es el sonido característico del blues.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá la pentatónica mayor de Do ascendente: Do, Re, Mi, Sol, La, Do.',
        requiredSequence: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
        mode: 'sequence',
        hint: 'Es la escala de Do salteando Fa y Si.'
      }
    },
  },
  '5c': {
  content: `
### Por qué se te borra lo que ayer te salía

La curva del olvido de Ebbinghaus tiene 140 años y sigue vigente: lo que entra de golpe se va de golpe. Treinta repeticiones seguidas de la misma escala producen una ejecución excelente **hoy** y un recuerdo pobre **mañana**. Eso tiene nombre: la brecha entre la sala de estudio y el escenario.

#### 1. Práctica intercalada: se siente peor, rinde el doble

En el estudio clásico con bateadores, la práctica **en bloque** (mismo lanzamiento treinta veces) dio 25 % de mejora en dos días. La práctica **intercalada** (lanzamientos mezclados al azar) dio 57 %: más del doble. Lo mismo se replicó con pianistas aprendiendo piezas.

El detalle importante: **durante** la práctica intercalada te sentís peor. Fallás más, dudás más. Robert Bjork lo llamó *dificultades deseables*: el esfuerzo extra es exactamente el que construye memoria duradera. Si tu práctica se siente cómoda, probablemente no estés aprendiendo.

#### 2. Recuperar antes de tocar

Antes de apoyar las manos, **decí en voz alta** las siete notas de la escala y dónde cae el 4º dedo. Sin mirar. El esfuerzo de sacarla de la memoria es lo que la fija; leerla o repetirla no.

Es la diferencia entre **reconocer** y **recordar**. En el escenario solo sirve lo segundo.

#### 3. El sistema de las 3 escalas del día

Tres cajones, como una caja de Leitner:

| Cajón | Qué hay | Cada cuánto |
|---|---|---|
| **1 · Nuevas** | Las que todavía se traban | Todos los días |
| **2 · En proceso** | Salen, pero pensando | Día por medio |
| **3 · Firmes** | Salen solas | Una vez por semana |

**La sesión:** elegí **una escala de cada cajón**. Rondas de 2 minutos rotando A → B → C, A → B → C, A → B → C. Nunca veinte minutos seguidos de la misma.

**El ascenso:** si sale limpia dos días seguidos, sube de cajón. Un solo tropiezo y vuelve al cajón 1. Sin negociar.

#### 4. Práctica variable: cambiá algo en cada ronda

Repetir idéntico entrena una sola versión del movimiento. Cambiá **una** cosa por ronda:

- **Ritmo:** galope largo-corto, después corto-largo.
- **Articulación:** todo ligado, después todo picado.
- **Dinámica:** creciendo hacia la cima, decreciendo a la vuelta.
- **Dirección:** empezá desde arriba.
- **Manos:** separadas, juntas, y en movimiento contrario.

#### 5. Dormí sobre eso

La consolidación motora ocurre mientras dormís. **20 minutos por día durante 5 días rinden mucho más que 100 minutos en un día.** No hay técnica de estudio que le gane a distribuir las horas.

> Los tres modos del Gimnasio de Escalas —Camino de notas, Nota faltante y Fórmula T–S— son tres formas distintas de recuperar la misma escala. Rotá entre ellos: eso ya es práctica intercalada.
    `,
  dictationScript: 'Te pasó, seguro: practicaste una escala treinta veces seguidas, te salió redonda, y al otro día no te acordabas. No es tu culpa ni tu memoria. Es que repetir en bloque se siente bárbaro y no deja nada. La práctica intercalada, mezclar tres escalas y rotar, se siente peor mientras la hacés y rinde más del doble a los dos días. Robert Bjork le puso nombre: dificultades deseables. Y una cosa más: antes de poner las manos, decí en voz alta las siete notas. Ese esfuerzo de acordarte es lo que fija, no la repetición.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'Comparando práctica en bloque contra práctica intercalada, ¿qué encontró la investigación?',
          options: [
            'La práctica en bloque rinde más porque se siente mejor',
            'La intercalada se siente peor mientras se practica, pero da más del doble de mejora a los dos días',
            'Son equivalentes',
            'La intercalada solo sirve para deportistas'
          ],
          correctIndex: 1,
          explanation: 'Mezclar tareas produce más errores durante la práctica y mucha más retención después. La sensación de fluidez del bloque es un espejismo.'
        },
        {
          question: '¿Qué conviene hacer ANTES de apoyar las manos sobre la escala del día?',
          options: [
            'Mirar la digitación en el papel',
            'Recordarla en voz alta —las notas y dónde cae el 4º dedo— sin mirar',
            'Tocarla diez veces rápido para entrar en calor',
            'Poner el metrónomo al doble de velocidad'
          ],
          correctIndex: 1,
          explanation: 'La recuperación activa desde la memoria es lo que fija. Leer o repetir sin esfuerzo de recordar deja mucho menos.'
        },
        {
          question: 'Tenés 100 minutos por semana para escalas. ¿Cómo los repartís?',
          options: ['Todo junto un día', '50 y 50 en dos días', '20 minutos por día durante 5 días', 'Da lo mismo'],
          correctIndex: 2,
          explanation: 'La consolidación ocurre entre sesiones, sobre todo durmiendo. Distribuir siempre le gana a acumular.'
        }
      ],
      practicalTask: {
        instruction: 'Ronda de práctica variable: tocá La mayor DESCENDENTE, desde arriba: La, Sol#, Fa#, Mi, Re.',
        requiredSequence: ['A5', 'G#5', 'F#5', 'E5', 'D5'],
        mode: 'sequence',
        hint: 'Empezar desde arriba obliga a recuperar la escala en vez de dejarla correr de memoria motora.'
      }
    },
  },
  '5d': {
  content: `
### Estudiar sin piano

Imaginar un movimiento con suficiente detalle activa casi las mismas áreas motoras que ejecutarlo. Por eso los concertistas estudian en el avión y en la sala de espera. No reemplaza al teclado; lo multiplica.

#### 1. Las tres capas de la memoria de una escala

Una escala bien memorizada está guardada de tres formas distintas. Si una falla, las otras dos te sostienen:

1. **Verbal** — podés *nombrar* las siete notas y sus alteraciones sin tocar.
2. **Auditiva (audiación)** — podés *escucharla por dentro* antes de que suene.
3. **Motora** — la mano *sabe la forma*: la distancia, el peso, dónde pasa el pulgar.

La mayoría de los estudiantes guardan solo la tercera. Por eso, cuando la mano se traba, no queda nada abajo.

#### 2. El protocolo de 90 segundos

Sin piano, con los ojos cerrados:

- **30 s — nombrar.** Decí las siete notas y dónde cae el 4º dedo.
- **30 s — cantar.** Cantá la escala con los grados: 1-2-3-4-5-6-7-8. Con la voz, aunque desafines.
- **30 s — sentir.** Imaginá la mano tocándola **en primera persona**: el tacto de la tecla, el fondo, el sonido. No te veas de afuera como en un video; sentilo desde adentro.

#### 3. Dónde poner la atención (esto cambia todo)

Uno de los hallazgos más replicados del aprendizaje motor: el **foco externo** —el sonido que sale, el fondo de la tecla, la línea que dibuja la frase— produce mejor ejecución y mejor retención que el **foco interno** —mis dedos, mi muñeca, mi pulgar—.

Traducido: en vez de *"que el pulgar pase limpio"*, pensá *"que el Fa suene igual de parejo que el Mi"*. Sale mejor, y encima se aprende mejor.

#### 4. La escala fantasma

Tocá la escala completa **sobre la tapa cerrada del piano**, con la digitación exacta y el tempo real. Sin sonido no hay nada que te tape los errores de movimiento: los sentís. Después tocala de verdad. La diferencia se nota en la primera pasada.
    `,
  dictationScript: 'Los pianistas de concierto estudian en el avión, sin piano. No es pose. Cuando imaginás un movimiento con detalle, con el tacto y el sonido, se activan casi las mismas áreas del cerebro que cuando lo hacés. Ahora, la clave está en dónde ponés la atención. Si pensás en tus dedos, tocás peor. Si pensás en el sonido que sale y en el fondo de la tecla, tocás mejor. Es de los resultados más repetidos del aprendizaje motor y casi nadie se lo dice a un pianista.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'Mientras tocás una escala, ¿dónde conviene poner la atención?',
          options: [
            'En los dedos y la muñeca (foco interno)',
            'En el sonido que sale y el fondo de la tecla (foco externo)',
            'En la partitura, siempre',
            'En contar las repeticiones'
          ],
          correctIndex: 1,
          explanation: 'El foco externo —el resultado sonoro— da mejor ejecución y mejor retención que el foco interno en los propios movimientos. Es uno de los resultados más replicados del aprendizaje motor.'
        },
        {
          question: '¿Cómo conviene imaginar el movimiento en la práctica mental?',
          options: [
            'Viéndote de afuera, como en un video',
            'En primera persona, con el tacto de la tecla y el sonido',
            'Solo leyendo las notas mentalmente',
            'Contando el ritmo en voz alta'
          ],
          correctIndex: 1,
          explanation: 'La imagen motora en primera persona, con sensación táctil y sonido, es la que activa el sistema motor. Verse desde afuera es una imagen visual, no motora.'
        }
      ],
      practicalTask: {
        instruction: 'Sin mirar el teclado, recordá Sol mayor completa. Después tocá una sola nota: aquella donde cae el 4º dedo de la mano derecha.',
        requiredSequence: ['F#5'],
        mode: 'sequence',
        hint: 'En el lado de los sostenidos, el 4º dedo derecho cae en la sensible: el 7º grado de la escala.'
      }
    },
  },
  '5i': {
  content: `
### Cuando la escala paralela ya no enseña nada

Tocar la escala con las dos manos en paralelo, cuatro octavas, todos los días, deja de rendir apenas sale limpia. Estas cuatro variantes la vuelven a poner difícil — en el sentido bueno.

#### 1. Movimiento contrario

Las dos manos arrancan en la **misma nota** (el mismo nombre, distinta octava, o incluso el mismo Do) y se abren para lados opuestos.

En Do mayor, la digitación es **espejo perfecto**: el 1 con el 1, el 2 con el 2, el pulgar pasa en las dos manos al mismo tiempo. Por eso es la primera variante que se aprende: la simetría trabaja a favor.

#### 2. En terceras

La mano toca **dos líneas de escala a la vez**, separadas por una tercera: Do+Mi, Re+Fa, Mi+Sol… Es el ejercicio que más ordena la mano derecha, porque obliga a que los dedos largos y cortos bajen con el mismo peso.

Empezá **una octava, lento, y solo con la derecha**. Si suena "cojo" — una de las dos voces más fuerte —, ahí está el trabajo.

#### 3. En sextas y en décimas

Misma idea con más distancia. Las **décimas** (una tercera más una octava) entre las manos son el sonido de casi todo el romanticismo: la izquierda hace de contrabajo y la derecha canta.

#### 4. La variante que más rinde: el ritmo

Sobre la misma escala de siempre:

- **Tresillos** — el acento cae en una nota distinta en cada octava.
- **Ritmo punteado** — largo-corto, largo-corto. Después al revés.
- **Acentos cada 3** — con siete notas por octava, el acento se corre solo.

Esto no es adorno: cambiar el agrupamiento rítmico obliga al cerebro a **re-mapear** el pasaje en vez de repetirlo en piloto automático. Es la misma lógica de la práctica intercalada, aplicada adentro de una sola escala.

#### 5. En qué orden meterlas

Semana 1 paralelo limpio → semana 2 sumá movimiento contrario → semana 3 sumá una variante rítmica → semana 4 terceras, una octava. No las junte todas de una: cada variante tiene que estar cómoda antes de que entre la siguiente.
    `,
  dictationScript: 'Si la escala te sale bien en paralelo, ya no te está enseñando nada. Ahí empiezan las variantes. Movimiento contrario: las dos manos salen de la misma nota y se van para lados opuestos, y como la digitación es simétrica sale sola. En terceras, una mano toca la escala y la otra la misma escala arrancando dos notas después: te obliga a coordinar dos líneas. Y hay una variante que rinde más que ninguna: cambiar el ritmo. La misma escala en tresillos, después punteada, después con acentos cada tres notas. La mano cree que está aprendiendo otra cosa y en realidad está afinando la misma.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Por qué el movimiento contrario en Do mayor es la variante más fácil de arrancar?',
          options: [
            'Porque se toca más lento',
            'Porque la digitación de las dos manos es simétrica y los pulgares pasan a la vez',
            'Porque solo usa la mano derecha',
            'Porque no tiene teclas negras'
          ],
          correctIndex: 1,
          explanation: 'En movimiento contrario desde la misma nota, los dedos se corresponden en espejo: 1 con 1, 2 con 2. Esa simetría es un andamio que el paralelo no te da.'
        },
        {
          question: '¿Qué gana la práctica al cambiarle el ritmo a una escala ya sabida?',
          options: [
            'Nada, es solo para no aburrirse',
            'Obliga a reagrupar el pasaje en vez de repetirlo en automático, y eso fija mejor',
            'Hace que se toque más rápido enseguida',
            'Cambia la digitación'
          ],
          correctIndex: 1,
          explanation: 'Reagrupar rompe el automatismo y fuerza a reconstruir el movimiento: es una dificultad deseable, del mismo tipo que la práctica intercalada.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá cinco notas de Do mayor subiendo y volvé bajando, parejo: Do, Re, Mi, Fa, Sol, Fa, Mi, Re, Do.',
        requiredSequence: ['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4'],
        mode: 'sequence',
        hint: 'Que la vuelta suene igual de pareja que la ida: ahí se nota el control.'
      }
    },
  },
  '6': {
  content: `
### El Lenguaje Escrito de la Música 

No le temas a la partitura: es simplemente un gráfico de coordenadas. El eje vertical indica la altura (agudo o grave) y el eje horizontal el tiempo.

#### 1. La Clave de Sol (Mano Derecha / Registro Agudo)
- Nace en la **segunda línea** del pentagrama, indicando que esa línea es la nota **Sol (G4)**.
- Se utiliza para melodías y acordes medios y agudos.

#### 2. La Clave de Fa (Mano Izquierda / Registro Grave)
- Los dos puntos encierran la **cuarta línea**, indicando que es la nota **Fa (F3)**.
- Se utiliza para los bajos y el soporte armónico.

#### 3. El Do Central (C4)
El Do central se dibuja con una **línea adicional** flotante entre ambos pentagramas. Es el centro neurálgico que conecta ambas manos.
    `,
  dictationScript: 'Che, leer partituras no es ningún cuco, pensalo como un mapa de la ciudad. El gran pentagrama junta dos sistemas de cinco líneas: arriba la Clave de Sol para la mano derecha y los agudos, y abajo la Clave de Fa para la mano izquierda y los graves. Y justo en el medio, como un puente uniendo los dos mundos, está el Do Central con su propia rayita. Miralo con calma, que el ojo se acostumbra enseguida.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota musical define la segunda línea del pentagrama en la Clave de Sol?',
          options: ['Do', 'Mi', 'Sol', 'La'],
          correctIndex: 2,
          explanation: 'La Clave de Sol se dibuja alrededor de la segunda línea y fija esa posición para la nota Sol (G4).'
        },
        {
          question: '¿En qué registro y con qué mano se toca comúnmente la Clave de Fa?',
          options: [
            'Registro agudo con mano derecha',
            'Registro grave con mano izquierda',
            'Solo con los pies en los pedales',
            'Únicamente teclas negras'
          ],
          correctIndex: 1,
          explanation: 'La Clave de Fa representa las frecuencias graves y se asigna habitualmente a la mano izquierda.'
        }
      ],
      practicalTask: {
        instruction: 'Toca los 3 pilares del Gran Pentagrama: F3 (referencia clave de Fa), C4 (Do central) y G4 (referencia clave de Sol).',
        requiredSequence: ['F3', 'C4', 'G4'],
        mode: 'sequence',
        hint: 'Toca F3 en el registro grave, C4 en el centro y G4 en el agudo.'
      }
    },
  },
  '7': {
  content: `
### El Nacimiento de la Armonía 

La armonía ocurre cuando dos o más notas suenan al mismo tiempo creando consonancia o disonancia.

#### 1. Cómo se Construye una Tríada Básica
Se apilan terceras sobre una nota raíz:
- **Raíz (1):** Da nombre al acorde (ej. Do).
- **Tercera (3):** Define la emoción (Mayor = luminosa, Menor = introspectiva).
- **Quinta (5):** Da peso y resonancia (Quinta Justa = 7 semitonos).

#### 2. Do Mayor (C)
- **Do (C4) + Mi (E4) + Sol (G4)**
- Distancias: 4 semitonos (Tercera Mayor) + 3 semitonos (Tercera Menor).

#### 3. Do Menor (Cm)
- **Do (C4) + Mi♭ (D#4) + Sol (G4)**
- Distancias: 3 semitonos (Tercera Menor) + 4 semitonos (Tercera Mayor).
- Digitación recomendada: **1 - 3 - 5**.
    `,
  dictationScript: 'Un acorde es un coro de notas sonando al mismo tiempo, che. La tríada básica tiene tres notas: la fundamental que le da el nombre, la tercera que define el sentimiento, y la quinta que le da estabilidad. En Do Mayor tocamos Do, Mi y Sol. Si a ese Mi lo bajás apenas un semitono a Mi bemol, el acorde se transforma en Do menor, melancólico e íntimo. Mirá cómo un milímetro de diferencia cambia toda la emoción del alma.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota distingue a un acorde de Do Mayor de uno de Do Menor?',
          options: [
            'La quinta (Sol se mueve a Fa)',
            'La tercera (Mi baja medio tono a Mi bemol / D#)',
            'La raíz (Do sube a Re)',
            'Ninguna, suenan idénticos'
          ],
          correctIndex: 1,
          explanation: 'La tercera es la nota modal que define el carácter mayor (Mi) o menor (Mi bemol).'
        },
        {
          question: '¿Qué dedos se recomiendan para tocar una tríada en posición fundamental con la mano derecha?',
          options: ['1 - 2 - 3', '1 - 3 - 5', '2 - 3 - 4', '3 - 4 - 5'],
          correctIndex: 1,
          explanation: 'El pulgar (1), medio (3) y meñique (5) dejan un dedo libre entre medias para una posición relajada.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el acorde de Do Mayor simultáneamente: C4, E4 y G4 con dedos 1-3-5.',
        requiredSequence: ['C4', 'E4', 'G4'],
        mode: 'chord',
        hint: 'Presiona las tres teclas juntas buscando que suenen niveladas.'
      }
    },
  },
  '7b': {
  content: `
### El idioma de las canciones

En una partitura clásica está todo escrito nota por nota. En una canción hay una letra, y arriba, un cifrado. El cifrado no te dice **cómo** tocarlo — eso lo decidís vos — te dice **qué** notas están permitidas.

#### 1. Las cinco reglas que resuelven casi todo

| Escribe | Se llama | Es |
|---|---|---|
| **C** | Do mayor | 1 – 3 – 5 |
| **Cm** | Do menor | 1 – ♭3 – 5 |
| **C7** | Do con séptima | 1 – 3 – 5 – ♭7 |
| **Cmaj7** | Do séptima mayor | 1 – 3 – 5 – 7 |
| **Csus4** | Do suspendida | 1 – **4** – 5 |

Y una regla más, la que más se malinterpreta: **el 7 solo siempre es menor**. **C7** lleva Si♭, no Si. Para el Si natural hay que escribir **Cmaj7** (o **CM7**, o **C△**).

#### 2. La barra: acordes con bajo puesto

**C/E** se lee "Do con bajo Mi". El acorde es Do mayor; lo único que cambia es qué nota va abajo de todo. Sirve para que el bajo camine de a un paso en vez de saltar:

**C – C/B – Am – Am/G – F**  → el bajo baja Do, Si, La, Sol, Fa. Una escalerita.

#### 3. Los apellidos que te vas a cruzar

- **dim** o **°** — disminuido.
- **aug** o **+** — aumentado.
- **6** — se le suma la sexta (C6 = Do, Mi, Sol, La). Muy usado en finales.
- **add9** — se le suma la novena **sin** la séptima.
- **9, 11, 13** — sí llevan séptima; son extensiones (vienen más adelante).

#### 4. Cómo se toca en la vida real

Nadie toca **C** como tres notas pegadas en el centro del teclado. Lo normal:

- **Izquierda**: la fundamental sola, o fundamental + quinta.
- **Derecha**: el acorde en la inversión que quede **más cerca** del anterior.

Ese es todo el secreto de que un acompañamiento suene profesional y no a ejercicio.
    `,
  dictationScript: 'Che, el cifrado americano es el idioma en el que está escrita cualquier canción que busques en internet, y se aprende en diez minutos. La letra sola es acorde mayor: C es Do mayor. La letra con eme chica es menor: Am es La menor. Un siete solo quiere decir séptima menor, ese sabor a que algo va a seguir. Sus cuatro es correr la tercera un semitono para arriba, y queda esa cosa suspendida que pide resolver. Y si ves una barra, como C barra E, lo de la derecha es la nota del bajo, nada más. Con esas cinco reglas leés el noventa por ciento de lo que hay dando vueltas.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué notas tiene el acorde G7?',
          options: [
            'Sol, Si, Re, Fa♯',
            'Sol, Si, Re, Fa',
            'Sol, Si♭, Re, Fa',
            'Sol, Do, Re, Fa'
          ],
          correctIndex: 1,
          explanation: 'El 7 solo indica séptima menor: de Sol a Fa hay diez semitonos. Con Fa♯ sería Gmaj7, que se escribe distinto.'
        },
        {
          question: 'En el cifrado C/E, ¿qué significa el Mi?',
          options: [
            'Que hay que tocar dos acordes a la vez',
            'Que el Mi va en el bajo, pero el acorde sigue siendo Do mayor',
            'Que el acorde es Mi mayor',
            'Que se toca Do y después Mi'
          ],
          correctIndex: 1,
          explanation: 'Lo que está después de la barra es la nota del bajo. El acorde no cambia: cambia su inversión y, con eso, cómo camina la línea grave.'
        }
      ],
      practicalTask: {
        instruction: 'Armá el acorde Am (La menor) en posición fundamental: La, Do, Mi.',
        requiredSequence: ['A4', 'C5', 'E5'],
        mode: 'chord',
        hint: 'Letra con eme chica = menor: fundamental, tercera menor y quinta justa.'
      }
    },
  },
  '7c': {
  content: `
### Las cuatro tríadas, completas

Una tríada son dos terceras apiladas. Según qué tercera va abajo y cuál arriba, salen exactamente **cuatro** combinaciones. Ya conocés dos.

| Tríada | Se apila | Suena a |
|---|---|---|
| **Mayor** | 3ª mayor + 3ª menor | luz, reposo |
| **Menor** | 3ª menor + 3ª mayor | sombra, reposo |
| **Disminuida** | 3ª menor + 3ª menor | suspenso, urgencia |
| **Aumentada** | 3ª mayor + 3ª mayor | flotar, extrañeza |

#### 1. La disminuida: la que empuja

En Do mayor, la tríada del **séptimo grado** es **Si disminuido** (Si – Re – Fa). Tiene un tritono adentro (Si–Fa), y el tritono nunca se queda quieto: pide resolver.

Por eso Bdim funciona como un **G7 sin la fundamental** — de hecho son las mismas notas menos el Sol. Es un dominante disfrazado: donde diga "resolvé a Do", resuelve a Do.

**El uso que más rinde:** el **disminuido de paso**. Entre dos acordes que están a un tono, metele el disminuido del medio.
C → **C♯dim** → Dm. El bajo sube de a semitono y todo suena inevitable.

#### 2. La aumentada: la que no tiene casa

Do aumentado (Do – Mi – Sol♯) apila dos terceras mayores. Es **simétrica**: si la invertís, vuelve a ser una tríada aumentada. No tiene fundamental privilegiada, así que el oído no sabe dónde está parado.

Eso, que suena a defecto, es su función: **empujar sin comprometerse**. El caso clásico es la línea que sube por dentro del acorde:

**C → Caug → C6 → C7**  → la voz interna hace Sol, Sol♯, La, Si♭. Suena a los años cincuenta, a Beatles, a bolero.

#### 3. Cómo reconocerlas al tacto

- **Disminuida** — la mano queda *apretada*: tres semitonos y tres semitonos.
- **Aumentada** — la mano queda *abierta y pareja*: cuatro y cuatro.

Son las dos únicas tríadas donde las dos terceras son **iguales**. Si la mano se siente simétrica, es una de estas dos.
    `,
  dictationScript: 'Hay cuatro tríadas, no dos. Ya sabés la mayor y la menor; faltan las dos incómodas. La disminuida son dos terceras menores apiladas: suena a suspenso, a que algo malo está por pasar, y es el acorde que se arma sobre el séptimo grado. La aumentada son dos terceras mayores: suena a que el suelo se movió, no tiene tónica clara, y sirve justo para eso, para empujar de un acorde a otro. Las dos son perfectamente simétricas, y por eso mismo no tienen casa: podés resolverlas para cualquier lado.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cómo está formada una tríada disminuida?',
          options: [
            'Dos terceras mayores',
            'Dos terceras menores',
            'Una tercera mayor y una menor',
            'Una cuarta y una quinta'
          ],
          correctIndex: 1,
          explanation: 'Tercera menor + tercera menor. Entre las puntas queda un tritono, y de ahí sale toda su tensión.'
        },
        {
          question: '¿Cuál es el uso más común del acorde disminuido en una canción?',
          options: [
            'Como acorde final',
            'Como acorde de paso entre dos acordes separados por un tono',
            'Para reemplazar la tónica',
            'Solo aparece en música clásica'
          ],
          correctIndex: 1,
          explanation: 'El disminuido de paso (C → C♯dim → Dm) hace que el bajo suba de a semitono y conecta dos acordes vecinos con una tensión brevísima.'
        }
      ],
      practicalTask: {
        instruction: 'Armá la tríada disminuida sobre Si: Si, Re, Fa.',
        requiredSequence: ['B4', 'D5', 'F5'],
        mode: 'chord',
        hint: 'Tres semitonos de Si a Re y tres de Re a Fa. Las tres son teclas blancas.'
      }
    },
  },
  '8': {
  content: `
### La Familia Armónica Diatónica 

En cualquier tonalidad mayor, los acordes formados sobre cada grado tienen una cualidad inmutable:

| Grado | Nombre Romano | Acorde en Do | Cualidad | Emoción / Rol |
|---|---|---|---|---|
| **I** | Tónica | **C (Do Mayor)** | Mayor | Hogar, reposo absoluto |
| **ii** | Supertónica | **Dm (Re menor)** | Menor | Movimiento suave |
| **iii** | Mediante | **Em (Mi menor)** | Menor | Nostálgico, transición |
| **IV** | Subdominante | **F (Fa Mayor)** | Mayor | Apertura, impulso |
| **V** | Dominante | **G (Sol Mayor)** | Mayor | Tensión máxima, pide resolver a I |
| **vi** | Relativo Menor | **Am (La menor)** | Menor | Melancolía reflexiva |
| **vii°** | Sensible | **Bdim (Si disminuido)** | Disminuido | Alta inestabilidad |
    `,
  dictationScript: 'Mirá qué maravilla: cada una de las siete notas de la escala de Do puede ser la raíz de su propio acorde usando solo las teclas blancas. Si subís por el teclado manteniendo la posición fija de dedos uno, tres y cinco, vas a sacar los siete acordes de la tonalidad: Do Mayor, Re menor, Mi menor, Fa Mayor, Sol Mayor, La menor y Si disminuido. Acordate de los grados romanos, que con eso sacás cualquier tema de oído.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la tonalidad de Do Mayor, ¿cuáles son los tres acordes MAYORES principales?',
          options: ['Dm, Em, Am', 'C, F, G (Grados I, IV y V)', 'C, Dm, Em', 'Am, Bdim, C'],
          correctIndex: 1,
          explanation: 'Los grados I (C), IV (F) y V (G) son los tres pilares mayores de la tonalidad.'
        },
        {
          question: '¿Cuál es el acorde relativo menor (grado vi) de Do Mayor?',
          options: ['Re menor (Dm)', 'Mi menor (Em)', 'La menor (Am)', 'Fa menor (Fm)'],
          correctIndex: 2,
          explanation: 'La menor (Am) es el grado vi y comparte dos notas idénticas con Do Mayor (Do y Mi).'
        }
      ],
      practicalTask: {
        instruction: 'Toca los tres acordes mayores pilares en sucesión: C (C4, E4, G4), luego F (F4, A4, C5), y finalmente G (G4, B4, D5).',
        requiredSequence: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5', 'G4', 'B4', 'D5'],
        mode: 'sequence',
        hint: 'I (Do Mayor) - IV (Fa Mayor) - V (Sol Mayor).'
      }
    },
  },
  '8b': {
  content: `
### Siete acordes, tres trabajos

Memorizar siete acordes por tonalidad son 84 acordes en las doce. Memorizar **tres funciones** son tres ideas que se repiten en todas.

#### 1. Las tres funciones

| Función | Grados | Qué hace |
|---|---|---|
| **Tónica (T)** | I, vi, iii | Casa. Reposo. |
| **Subdominante (S)** | IV, ii | Se aleja. Abre la puerta. |
| **Dominante (D)** | V, vii° | Tensión. Empuja a volver. |

El ciclo natural es **T → S → D → T**. Podés saltear la S, podés repetir, pero el orden nunca se invierte del todo: la dominante no vuelve a la subdominante, va a la tónica.

#### 2. Por qué los grados se agrupan así

Los acordes de una misma función **comparten dos de sus tres notas**:

- **C** (Do-Mi-Sol) y **Am** (La-Do-Mi) comparten Do y Mi → los dos son tónica.
- **F** (Fa-La-Do) y **Dm** (Re-Fa-La) comparten Fa y La → los dos son subdominante.
- **G** (Sol-Si-Re) y **Bdim** (Si-Re-Fa) comparten Si y Re → los dos son dominante.

No es una convención: **son parientes de sangre**.

#### 3. Lo que esto te habilita

**Sustituir.** Si una progresión dice C – F – G – C y querés otro color, cambiá el C del medio por Am. La función se respeta, el clima cambia. Eso es todo el "reharmonizado" del pop.

**Predecir.** Si estás sacando una canción de oído y llegaste al V, ya sabés que lo más probable es que vuelva al I. Escuchar armonía es escuchar funciones.

#### 4. La única regla fuerte

**La dominante quiere resolver a la tónica.** Cuando *no* lo hace —cuando el V va al vi— el efecto tiene nombre: **cadencia rota**. Y funciona justamente porque el oído esperaba otra cosa. Sin la regla no habría sorpresa.
    `,
  dictationScript: 'Los siete acordes de la tonalidad no hacen siete cosas distintas: hacen tres. Están los que son casa, los que se alejan y los que empujan de vuelta. La tónica es casa: el uno, y también el tres y el seis, que son primos suyos. La subdominante te aleja: el cuatro y el dos. Y la dominante es la que tira para volver: el cinco y el siete. Toda la armonía tonal, desde Bach hasta la cumbia, es ese viaje de ida y vuelta. Cuando escuchás una canción y sabés cuándo va a volver a casa, es porque reconociste la función, no el acorde.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué función cumplen el IV y el ii grado?',
          options: ['Tónica', 'Subdominante', 'Dominante', 'Ninguna, son de paso'],
          correctIndex: 1,
          explanation: 'F y Dm comparten dos notas (Fa y La) y hacen el mismo trabajo: alejarse de la tónica y preparar la dominante.'
        },
        {
          question: '¿Por qué Am puede reemplazar a C en una progresión?',
          options: [
            'Porque tiene el mismo número de notas',
            'Porque comparten dos de sus tres notas y cumplen la misma función de tónica',
            'Porque las dos son escalas mayores',
            'Porque están al lado en el teclado'
          ],
          correctIndex: 1,
          explanation: 'C es Do-Mi-Sol y Am es La-Do-Mi: comparten Do y Mi. Ese parentesco es lo que permite sustituir sin romper la progresión.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá un recorrido T → S → D: primero C (Do-Mi-Sol), después F (Fa-La-Do) y por último G (Sol-Si-Re).',
        requiredSequence: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5', 'G4', 'B4', 'D5'],
        mode: 'sequence',
        hint: 'Casa, alejarse, empujar. Escuchá cómo el último pide volver al primero.'
      }
    },
  },
  '8c': {
  content: `
### La puntuación de la música

Una frase musical se cierra con una **cadencia**. Cambiar la cadencia cambia lo que el oyente siente al final, aunque la melodía sea la misma.

#### 1. Los cuatro finales

| Cadencia | Movimiento | Es como |
|---|---|---|
| **Auténtica** | V → I | un punto final |
| **Plagal** | IV → I | un "amén" |
| **Semicadencia** | ...→ V | una coma |
| **Rota** | V → vi | un punto suspensivo |

#### 2. Auténtica: el cierre de verdad

**G → C.** El Si (sensible) sube a Do y el Fa baja a Mi: el tritono se resuelve hacia adentro. Es el final más fuerte que existe en la música tonal.

Se vuelve todavía más definitiva si el bajo toca la fundamental de los dos acordes y la melodía termina en la tónica. Eso se llama **cadencia auténtica perfecta**, y es como termina casi toda pieza clásica.

#### 3. Plagal: cerrar sin empujar

**F → C.** No hay sensible, no hay tritono, no hay tensión que resolver: llega a casa caminando en vez de corriendo. De ahí el apodo de "cadencia del amén". El gospel, el soul y buena parte del rock la usan como final principal.

#### 4. Semicadencia: dejar la puerta abierta

Terminar **en** el V. La frase queda a la espera. Es lo que arma el juego de pregunta y respuesta: primera frase termina en V (pregunta), segunda frase termina en I (respuesta). Escuchá cualquier tema con estructura de ocho compases y está ahí.

#### 5. Rota: el final que no fue

**G → Am.** Todo estaba puesto para volver a C y en el último momento aparece el relativo menor. El oído se queda con la sensación de que la frase todavía no terminó — y por eso el compositor puede seguir cuatro compases más.

#### 6. El ejercicio que lo fija

Tocá la misma melodía de cuatro compases cuatro veces, cambiando solo el final: auténtica, plagal, semicadencia, rota. Es la forma más rápida de escuchar que la cadencia **no** es un detalle técnico: es lo que decide qué siente el que escucha.
    `,
  dictationScript: 'La cadencia es el signo de puntuación de la música. La auténtica, del cinco al uno, es el punto final: cierra y no queda nada colgando. La plagal, del cuatro al uno, es el amén de la iglesia: cierra pero más blandito, sin ese empujón. La semicadencia termina en el cinco y queda abierta, como una coma: sí o sí tiene que seguir algo. Y la rota va del cinco al seis, cuando el oído ya estaba preparado para el uno: es el final que te sorprende y que estira la frase un poco más. Si escuchás cadencias, escuchás la forma entera de la canción.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuál es la cadencia más conclusiva y por qué?',
          options: [
            'La plagal, porque es la de la iglesia',
            'La auténtica (V→I), porque la sensible sube a la tónica y el tritono resuelve',
            'La rota, porque sorprende',
            'La semicadencia, porque termina en el acorde más fuerte'
          ],
          correctIndex: 1,
          explanation: 'En V→I el tritono del acorde de dominante resuelve hacia adentro y la sensible sube medio tono a la tónica. Ninguna otra combinación cierra con esa fuerza.'
        },
        {
          question: '¿Qué efecto busca una cadencia rota (V→vi)?',
          options: [
            'Cerrar definitivamente',
            'Frustrar la resolución esperada para poder estirar la frase',
            'Cambiar de tonalidad',
            'Marcar el comienzo de la pieza'
          ],
          correctIndex: 1,
          explanation: 'El oído espera el I y recibe el vi. La expectativa incumplida deja la frase abierta y habilita seguir un poco más antes del cierre real.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá una cadencia auténtica: primero G (Sol-Si-Re) y después C (Do-Mi-Sol).',
        requiredSequence: ['G4', 'B4', 'D5', 'C4', 'E4', 'G4'],
        mode: 'sequence',
        hint: 'Escuchá cómo el Si del primer acorde pide subir al Do del segundo.'
      }
    },
  },
  '9': {
  content: `
### El Santo Grial de las Canciones 

La progresión **I - V - vi - IV** es el ciclo armónico más exitoso en la historia de la música comercial:
- *Let It Be* (The Beatles)
- *Someone Like You* (Adele)
- *Don't Stop Believin'* (Journey)
- *Despacito* (Luis Fonsi)

#### Los 4 Pasos del Viaje
1. **I (Do Mayor):** Casa, seguridad.
2. **V (Sol Mayor):** La aventura, energía elevada.
3. **vi (La menor):** El obstáculo, emoción introspectiva.
4. **IV (Fa Mayor):** La resolución esperanzadora que nos impulsa de vuelta a casa.
    `,
  dictationScript: 'Che, si te aprendés esta progresión te juro que podés acompañar más de cien temas famosos de corrido. Es la progresión uno, cinco, seis menor, cuatro. En Do Mayor tocamos: Do Mayor, Sol Mayor, La menor y Fa Mayor. Escuchá cómo viaja la energía: de la paz del Do al brillo del Sol, a la nostalgia del La menor y al despegue del Fa. Una fórmula redonda que nunca falla.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué acordes componen la progresión I - V - vi - IV en tonalidad de Do Mayor?',
          options: [
            'C - Dm - Em - F',
            'C - G - Am - F',
            'C - F - G - C',
            'Am - F - C - G'
          ],
          correctIndex: 1,
          explanation: 'I es Do (C), V es Sol (G), vi es La menor (Am), y IV es Fa (F).'
        },
        {
          question: '¿Por qué esta progresión resulta tan magnética para el cerebro humano?',
          options: [
            'Porque solo usa dos notas',
            'Porque equilibra acordes mayores luminosos con el relativo menor melancólico en un ciclo continuo',
            'Porque se toca únicamente con una mano',
            'Porque es disonante'
          ],
          correctIndex: 1,
          explanation: 'La alternancia entre el reposo de la tónica, la fuerza del dominante y la profundidad del relativo menor crea un balance perfecto.'
        }
      ],
      practicalTask: {
        instruction: 'Ejecuta las notas raíces de la progresión de oro en orden: C4, G4, A4 y F4.',
        requiredSequence: ['C4', 'G4', 'A4', 'F4'],
        mode: 'sequence',
        hint: 'I (Do) → V (Sol) → vi (La) → IV (Fa).'
      }
    },
  },
  '9b': {
  content: `
### El acorde no es el sonido: el patrón sí

Cuatro acordes idénticos pueden ser un himno, un bolero o una balada. Lo que cambia es **cómo se reparten en el tiempo**.

#### 1. Bloque

Todas las notas juntas, en el tiempo fuerte. Directo y potente. Es el sonido del rock, del gospel y de cualquier cosa que tenga que empujar.

Truco: **no toques todos los tiempos**. Bloques en 1 y en 3, silencio en 2 y en 4. El silencio es lo que le da el pulso.

#### 2. Arpegio

Una nota por vez, subiendo. Con la izquierda: **fundamental – quinta – octava – quinta**, en corcheas. Con la derecha, el acorde arriba o la melodía.

Es el patrón íntimo por excelencia: baladas de piano solo, intros, cualquier momento que tenga que sonar suave.

#### 3. Vals — bajo, acorde, acorde

En 3/4:

- Tiempo **1**: la fundamental, grave, sola.
- Tiempos **2 y 3**: el acorde, más agudo, corto.

Se mueve solo. Sirve para vals, para ranchera, para mucho folclore.

#### 4. Balada — el patrón de los cinco dedos

En 4/4, mano izquierda: **fundamental – quinta – octava – quinta**, una por tiempo. La derecha entra recién en el 2 con el acorde.

Es el que sostiene la mitad de las canciones lentas que conocés. Suena rico porque el bajo se mueve y la armonía no.

#### 5. Las dos reglas que separan a un principiante de alguien que acompaña

1. **Un patrón por sección.** Si cambiás de patrón cada cuatro compases, el tema se desarma. El patrón cambia en el estribillo, no antes.
2. **La mano derecha no repite la fundamental.** Si la izquierda ya tocó el Do grave, la derecha toca Mi–Sol–Do o Sol–Do–Mi, no otro Do abajo de todo. Duplicar la fundamental en el medio embarra el sonido.
    `,
  dictationScript: 'Ya sabés los acordes; ahora falta lo otro, que es cómo se tocan. Los mismos cuatro acordes suenan a himno, a bolero, a vals o a balada según qué patrón les pongas. En bloque, todo junto, es potencia y es lo que hace el rock. Arpegiado, de a una nota, es intimidad. El vals es bajo, acorde, acorde, y ya con eso se mueve solo. Y el patrón de balada, ese bajo, quinta, acorde, es el que sostiene la mitad de las canciones lentas que conocés. Elegí uno y sostenelo todo el tema: cambiar de patrón cada cuatro compases es el error más común del que recién empieza.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En el patrón de vals, ¿qué va en el primer tiempo?',
          options: [
            'El acorde completo',
            'La fundamental sola, en el grave',
            'La melodía',
            'Un silencio'
          ],
          correctIndex: 1,
          explanation: 'Bajo – acorde – acorde. La fundamental sola en el 1 marca el pulso y deja que el acorde caiga liviano en 2 y 3.'
        },
        {
          question: '¿Por qué conviene sostener un mismo patrón durante toda una sección?',
          options: [
            'Porque es más fácil de tocar',
            'Porque el patrón es parte de la identidad de la sección y cambiarlo seguido desarma el tema',
            'Porque lo exige la teoría',
            'No conviene: hay que variar cada compás'
          ],
          correctIndex: 1,
          explanation: 'El patrón funciona como la textura de la sección. Cambiarlo es un recurso de forma —para el estribillo, para el puente—, no algo que se hace cada cuatro compases.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá un patrón de balada sobre Do: Do grave, Sol, Do, y después el acorde Do-Mi-Sol.',
        requiredSequence: ['C3', 'G3', 'C4', 'E4', 'G4'],
        mode: 'sequence',
        hint: 'Fundamental, quinta y octava con la izquierda; el acorde entra después.'
      }
    },
  },
  '9c': {
  content: `
### Cinco moldes y ya podés acompañar casi todo

Las canciones no inventan progresiones nuevas: eligen entre unas pocas y las visten distinto.

#### 1. ii – V – I — el ladrillo del jazz

En Do: **Dm7 – G7 – Cmaj7**.

Es una función de cada tipo, en orden: subdominante, dominante, tónica. El bajo cae de quinta en quinta (Re → Sol → Do), que es el movimiento más fuerte que existe. Todo standard de jazz es una cadena de ii–V–I en tonalidades distintas.

#### 2. I – vi – IV – V — la de los cincuenta

En Do: **C – Am – F – G**.

Doo-wop, *Stand by me*, medio bolero. Es la I–V–vi–IV que ya conocés, con las piezas en otro orden: el vi entra segundo y le pone melancolía antes de que llegue el empujón.

#### 3. El canon — la escalera que baja

**C – G – Am – Em – F – C – F – G**.

El bajo baja casi escalonado: Do, Si, La, Sol, Fa, Mi, Fa, Sol. Esa línea descendente es lo que la hace irresistible; está en Pachelbel y en decenas de temas pop.

#### 4. El blues de doce compases

No es una progresión: es una **forma completa**, con su propio reloj.

| Compases | Acorde |
|---|---|
| 1–4 | I7 |
| 5–6 | IV7 |
| 7–8 | I7 |
| 9 | V7 |
| 10 | IV7 |
| 11 | I7 |
| 12 | V7 (*turnaround*) |

En Do: C7, F7, G7. Todos con séptima, siempre — incluida la tónica, que en el blues no descansa nunca. El compás 12 no cierra: te devuelve al 1.

#### 5. Cómo se estudian

No de memoria. **En números**. Si aprendés "dos, cinco, uno" y no "Re menor siete, Sol siete, Do", la progresión te sirve en las doce tonalidades desde el primer día. Los números son el idioma; las letras son la traducción.
    `,
  dictationScript: 'Ya tenés la del uno, cinco, seis, cuatro. Ahora te doy cuatro más y con eso sacás casi cualquier cosa. La dos, cinco, uno es el ladrillo del jazz: te la vas a cruzar en todos los standards. La de los cincuenta, uno, seis, cuatro, cinco, es el doo wop entero. El canon de Pachelbel es una escalera que baja y aparece en más canciones pop de las que te imaginás. Y el blues de doce compases es una forma completa, no una progresión: cuatro compases del uno, dos del cuatro, dos del uno, y el final que te devuelve al principio. Con estas cinco tenés el mapa.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En Do mayor, ¿cuáles son los acordes de un ii–V–I?',
          options: [
            'Dm7 – G7 – Cmaj7',
            'Em7 – A7 – Dmaj7',
            'C – F – G',
            'Am – F – C'
          ],
          correctIndex: 0,
          explanation: 'El ii de Do es Re menor, el V es Sol y el I es Do. El bajo cae de quinta en quinta: Re, Sol, Do.'
        },
        {
          question: 'En un blues de doce compases, ¿qué pasa en el compás 12?',
          options: [
            'Se cierra en el I',
            'Aparece el V7 como turnaround, que devuelve al principio',
            'Se cambia de tonalidad',
            'Se hace un silencio'
          ],
          correctIndex: 1,
          explanation: 'El turnaround del compás 12 no cierra: reabre la forma y empuja de vuelta al compás 1. Por eso el blues puede dar vueltas indefinidamente.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el ii de Do mayor en posición fundamental: Re, Fa, La.',
        requiredSequence: ['D4', 'F4', 'A4'],
        mode: 'chord',
        hint: 'El segundo grado de Do mayor es Re menor.'
      }
    },
  },
  '9d': {
  content: `
### Traducir una vez, no doce

Transportar nota por nota es lento y se equivoca. Transportar por **grados** es instantáneo.

#### 1. El método, en tres pasos

1. **Escribí la progresión en números romanos** en su tonalidad original.
   C – G – Am – F  →  **I – V – vi – IV**
2. **Armá los siete grados de la tonalidad nueva.** En Sol: G, Am, Bm, C, D, Em, F♯dim.
3. **Volvé a bajar los números.**
   I – V – vi – IV en Sol  →  **G – D – Em – C**

Treinta segundos, y no depende de cuántos acordes tenga el tema.

#### 2. La tabla que conviene tener en la cabeza

Los siete grados de cualquier tonalidad mayor, siempre en el mismo orden de calidades:

**I mayor · ii menor · iii menor · IV mayor · V mayor · vi menor · vii disminuido**

Eso no cambia nunca. Si sabés las siete notas de la escala, ya sabés sus siete acordes.

#### 3. Para qué se transporta en la vida real

- **Para que entre la voz.** Es la razón número uno. Si el cantante no llega al agudo, se baja un tono y listo.
- **Para que sea más cómodo de tocar.** Un tema en Re♭ mayor, con cinco bemoles, muchas veces se toca mejor en Do o en Re.
- **Para instrumentos transpositores.** Un saxo alto lee una sexta mayor arriba de lo que suena; si tocás con uno, vas a tener que transportar sí o sí.

#### 4. El atajo definitivo

**Aprendé todo en números desde el principio.** Si en vez de "Do, Sol, La menor, Fa" memorizás "uno, cinco, seis, cuatro", no tenés que transportar nunca: la canción ya está guardada en el formato que sirve en las doce tonalidades. Es exactamente lo mismo que hacer con las escalas la reducción a cinco formas de mano — memorizar el patrón, no los casos.
    `,
  dictationScript: 'Te va a pasar siempre: alguien quiere cantar el tema y no le da la voz en el tono en que está escrito. Transportar no es hacer cuentas nota por nota, eso es un infierno. Es traducir la progresión a números una sola vez y volver a bajarla en el tono nuevo. Do, Sol, La menor, Fa es uno, cinco, seis, cuatro. En Sol, ese mismo uno, cinco, seis, cuatro es Sol, Re, Mi menor, Do. Nada más. Y hay un atajo todavía mejor: si te aprendés la progresión en números desde el principio, ya la sabés en las doce tonalidades y no tenés que transportar nunca.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'La progresión C – G – Am – F transportada a Sol mayor queda:',
          options: [
            'G – D – Em – C',
            'G – C – Dm – A',
            'G – D – Bm – F',
            'A – E – F♯m – D'
          ],
          correctIndex: 0,
          explanation: 'Es un I–V–vi–IV. En Sol: I=G, V=D, vi=Em, IV=C.'
        },
        {
          question: '¿Cuál es el orden de calidades de los siete grados de una tonalidad mayor?',
          options: [
            'Mayor, mayor, menor, menor, mayor, menor, disminuido',
            'Mayor, menor, menor, mayor, mayor, menor, disminuido',
            'Menor, mayor, mayor, menor, menor, mayor, disminuido',
            'Cambia según la tonalidad'
          ],
          correctIndex: 1,
          explanation: 'I mayor, ii menor, iii menor, IV mayor, V mayor, vi menor, vii disminuido. Este patrón es idéntico en las doce tonalidades mayores.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el I de Sol mayor: Sol, Si, Re.',
        requiredSequence: ['G4', 'B4', 'D5'],
        mode: 'chord',
        hint: 'La tónica de Sol mayor es una tríada mayor: fundamental, tercera mayor y quinta justa.'
      }
    },
  },
  '10': {
  content: `
### ¿Qué es una Inversión? 

Invertir un acorde consiste en cambiar el orden vertical de sus notas, colocando como bajo una nota distinta a la raíz.

#### 1. Las Tres Posiciones de una Tríada
Para el acorde de **Do Mayor (C)**:
- **Posición Fundamental (5/3):** **C - E - G** (El Do es la nota más grave).
- **1ª Inversión (6/3):** **E - G - C** (El Mi es la nota más grave; Do se desplazó una octava arriba).
- **2ª Inversión (6/4):** **G - C - E** (El Sol es la nota más grave).

#### 2. El Principio del Camino Más Corto (Voice Leading)
Al pasar de **Do Mayor** a **Fa Mayor**:
- *Forma novata:* C (C-E-G) y saltar a F (F-A-C). ¡La mano vuela 4 teclas!
- *Forma maestra:* C (C-E-G) pasa a F en 2ª inversión (**C-F-A**). ¡El pulgar se queda quieto en Do y los otros dedos solo se abren un semitono y un tono!
    `,
  dictationScript: 'Mirá, un pianista principiante pega saltos bruscos con toda la mano para cambiar de acorde. En cambio, un maestro apenas mueve los dedos unos milímetros. Eso se logra con las inversiones, che. En vez de tocar siempre la raíz abajo, damos vuelta las notas del acorde. En Do Mayor tenés: posición fundamental Do-Mi-Sol, primera inversión Mi-Sol-Do, y segunda inversión Sol-Do-Mi. Son las mismas notas pero con una suavidad hermosa.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuáles son las notas de Do Mayor en su PRIMERA INVERSIÓN?',
          options: ['C - E - G', 'E - G - C', 'G - C - E', 'E - C - G'],
          correctIndex: 1,
          explanation: 'La 1ª inversión coloca la tercera (Mi) en el bajo, quedando Mi - Sol - Do.'
        },
        {
          question: '¿Cuál es la principal ventaja técnica y musical de utilizar inversiones?',
          options: [
            'Hacer que el piano suene desafinado',
            'Permitir transiciones suaves con mínimo movimiento de la mano (Voice Leading)',
            'Tocar únicamente con la mano izquierda',
            'Eliminar notas del acorde'
          ],
          correctIndex: 1,
          explanation: 'Las inversiones optimizan la ergonomía de la mano y producen una textura armónica refinada y conectada.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el acorde de Do Mayor en 1ª Inversión: E4, G4 y C5 de forma simultánea.',
        requiredSequence: ['E4', 'G4', 'C5'],
        mode: 'chord',
        hint: 'Mi en el bajo, Sol en el medio y Do agudo en la cima.'
      }
    },
  },
  '10b': {
  content: `
### El único intervalo que hay que buscar

Reconocer que **Mi-Sol-Do** es Do mayor no debería costar tres segundos. Con una sola regla cuesta uno.

#### 1. La regla de la cuarta

En una tríada, buscá el **único intervalo de cuarta**. La nota que está **arriba** de esa cuarta es la **fundamental**.

| Acorde | ¿Hay cuarta? | Fundamental | Posición |
|---|---|---|---|
| **Do - Mi - Sol** | No: 3ª + 3ª | Do (la de abajo) | Fundamental |
| **Mi - Sol - Do** | Sí: Sol → Do | **Do** | 1ª inversión |
| **Sol - Do - Mi** | Sí: Sol → Do | **Do** | 2ª inversión |

Si **no hay cuarta** —son dos terceras apiladas— estás en posición fundamental y la raíz es la nota más grave. Listo: no hay un cuarto caso.

Funciona igual en tríadas **mayores, menores y disminuidas**.

> **La excepción honesta:** la tríada **aumentada** (Do-Mi-Sol#) está hecha solo de terceras mayores en todas sus posiciones. Ahí la regla no aplica —y esa es justamente la razón de que la aumentada suene flotante y sin centro: no hay nada en su estructura que señale una fundamental.

#### 2. La misma regla para las séptimas

En un acorde de séptima, buscá el **intervalo de segunda**. La nota de arriba de la segunda es la fundamental.

- **Mi - Sol - Si♭ - Do** → Si♭ y Do son segunda; arriba está **Do** → es Do7 en 1ª inversión.

#### 3. Las tres formas al tacto

La mano no lee: siente distancias. Aprendé las tres formas como tres aperturas distintas:

| Posición | Estructura | Sensación en la mano |
|---|---|---|
| **Fundamental** | 3ª + 3ª | pareja, cerrada |
| **1ª inversión** | 3ª + 4ª | el hueco está **arriba** |
| **2ª inversión** | 4ª + 3ª | el hueco está **abajo** |

Con esas tres aperturas y la ubicación de la fundamental, tocás cualquier tríada en cualquier posición sin deletrear las notas.

#### 4. En el pentagrama: el muñeco de nieve

En posición fundamental las tres notas quedan **las tres en línea o las tres en espacio**: un muñeco de nieve prolijo. Si el patrón se rompe, hay inversión, y la regla de la cuarta te dice cuál.
    `,
  dictationScript: 'Te muestro un truco que vale por un semestre. Mirás Mi, Sol, Do y tardás en darte cuenta de que es Do mayor. Bueno: buscá el único intervalo de cuarta que hay en el acorde. La nota de arriba de esa cuarta es la fundamental. Sol a Do es cuarta, arriba está Do, entonces es Do mayor. Siempre. Y si no hay ninguna cuarta, si son dos terceras, estás en posición fundamental. Con eso resolvés cualquier tríada mayor, menor o disminuida en un segundo.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En el acorde Sol - Do - Mi, ¿cuál es la fundamental y en qué posición está?',
          options: [
            'Sol, en posición fundamental',
            'Do, en 2ª inversión',
            'Mi, en 1ª inversión',
            'Do, en 1ª inversión'
          ],
          correctIndex: 1,
          explanation: 'Sol → Do es el intervalo de cuarta; arriba está Do, así que la fundamental es Do. Con la quinta (Sol) en el bajo, es Do mayor en 2ª inversión.'
        },
        {
          question: '¿En qué tríada NO funciona la regla de la cuarta?',
          options: ['En la menor', 'En la disminuida', 'En la aumentada', 'En la mayor con séptima'],
          correctIndex: 2,
          explanation: 'La tríada aumentada está formada solo por terceras mayores en todas sus inversiones: no contiene ninguna cuarta que señale la fundamental. Por eso suena sin centro tonal.'
        },
        {
          question: 'En un acorde de séptima invertido, ¿qué intervalo buscás?',
          options: ['La cuarta', 'La segunda: la nota de arriba es la fundamental', 'La quinta', 'La séptima mayor'],
          correctIndex: 1,
          explanation: 'En las séptimas el "hueco" cambia de tamaño: el intervalo de segunda es el que delata la fundamental, que es su nota superior.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá simultáneamente Sol - Do - Mi (Do mayor en 2ª inversión): G4, C5 y E5.',
        requiredSequence: ['G4', 'C5', 'E5'],
        mode: 'chord',
        hint: 'La cuarta está abajo (Sol → Do) y la tercera arriba: es la forma "hueco abajo".'
      }
    },
  },
  '10c': {
  content: `
### El drill de una octava

Objetivo: que las tres posiciones de cualquier tríada salgan sin pensar, en las doce tonalidades.

#### 1. El carrusel I - IV - V

Los tres acordes que sostienen casi toda la música popular, tocados **dentro de una sola octava**, sin que la mano salte:

| Grado | Acorde en Do | Posición | Notas |
|---|---|---|---|
| **I** | Do mayor | fundamental | Do - Mi - Sol |
| **IV** | Fa mayor | **2ª inversión** | Do - Fa - La |
| **V** | Sol mayor | **1ª inversión** | Si - Re - Sol |
| **I** | Do mayor | fundamental | Do - Mi - Sol |

Toda la progresión vive entre Si3 y La4. La mano no viaja: los dedos se acomodan.

#### 2. La nota común manda

La regla que ordena todo el voice leading: **si una nota está en los dos acordes, dejala quieta; el resto se mueve lo mínimo.**

- De **Do** (Do-Mi-Sol) a **Fa** (Do-Fa-La): el **Do** se queda. Mi sube a Fa (un semitono), Sol sube a La (un tono).
- De **Do** a **Sol** (Si-Re-Sol): el **Sol** se queda. Mi baja a Re, Do baja a Si.

Un dedo quieto y dos que se corren un escalón. Eso es todo el "sonido de pianista".

#### 3. Sorteá las tonalidades, no las ordenes

Recorrer el círculo de quintas en orden tiene una trampa: podés **deducir** la siguiente en vez de **recuperarla** de memoria. Y lo que fija es recuperar.

Escribí las doce en papelitos y sacá tres por sesión. Sorteadas, el ejercicio se siente más difícil —y esa dificultad es la que deja memoria.

#### 4. La escalera del metrónomo

- Arrancá al tempo **donde no fallás**, no al que quisieras.
- **8 repeticiones limpias seguidas → +4 BPM.**
- **Un solo error → -8 BPM** y volvés a contar desde cero.

La velocidad es una consecuencia de la limpieza, nunca un objetivo. Practicar rápido con errores es practicar los errores.

#### 5. Las tres capas

1. **Manos separadas**, mirando.
2. **Manos juntas**, mirando.
3. **Manos juntas, ojos cerrados.** Esta última capa es la que convierte la forma en propiocepción: la mano encuentra el acorde sin la vista. Es la diferencia entre tocar mirando el teclado y tocar mirando al cantante.
    `,
  dictationScript: 'Este es el ejercicio que más rinde por minuto en todo el piano popular. Do mayor, Fa mayor, Sol mayor, los tres acordes de casi cualquier canción, tocados en una sola posición de mano, sin moverte. Do fundamental: Do Mi Sol. Fa en segunda inversión: Do Fa La. Sol en primera: Si Re Sol. Y volvés a Do. Todo en la misma octava, moviendo apenas los dedos. Cuando eso te sale en las doce tonalidades y sorteadas, no ordenadas, ya podés acompañar cualquier cosa.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En la progresión I-IV-V en Do con mínimo movimiento, ¿cómo se toca el Fa mayor?',
          options: [
            'En posición fundamental: Fa - La - Do',
            'En 2ª inversión: Do - Fa - La, para que el Do quede quieto',
            'En 1ª inversión: La - Do - Fa',
            'Con la mano izquierda solamente'
          ],
          correctIndex: 1,
          explanation: 'Do es la nota común entre Do mayor y Fa mayor. Tocando Fa en 2ª inversión (Do-Fa-La) el Do no se mueve y las otras dos voces suben un escalón.'
        },
        {
          question: '¿Por qué conviene sortear las tonalidades en lugar de recorrer el círculo de quintas en orden?',
          options: [
            'Porque el círculo de quintas está mal',
            'Porque el orden te deja deducir la siguiente en vez de recuperarla de memoria',
            'Porque sortear es más rápido',
            'Porque así se practican menos tonalidades'
          ],
          correctIndex: 1,
          explanation: 'En orden, la secuencia misma te da la respuesta. Sorteadas, tenés que recuperarla —y la recuperación con esfuerzo es lo que construye memoria duradera.'
        },
        {
          question: 'Con la escalera del metrónomo, ¿qué hacés después de un solo error?',
          options: ['Seguís igual', 'Subís 4 BPM para exigirte', 'Bajás 8 BPM y volvés a contar desde cero', 'Cambiás de ejercicio'],
          correctIndex: 2,
          explanation: 'Repetir con errores consolida los errores. Bajar y reconstruir limpio es lo que después permite subir de verdad.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el Fa mayor del carrusel: la 2ª inversión Do - Fa - La (C4, F4, A4), la que deja el Do quieto.',
        requiredSequence: ['C4', 'F4', 'A4'],
        mode: 'chord',
        hint: 'Misma zona que Do-Mi-Sol: el pulgar no se mueve del Do.'
      }
    },
  },
  '11': {
  content: `
### Desbloqueando los Dos Hemisferios Cerebrales 

Al tocar con dos manos no estás haciendo dos cosas a la vez: estás creando una **única coreografía unificada**.

#### 1. El Método Paso a Paso
1. **Paso 1:** Practica solo la mano izquierda hasta que puedas tocarla mirando hacia el techo.
2. **Paso 2:** Practica solo la mano derecha hasta que sea 100% automática.
3. **Paso 3:** Une ambas manos nota por nota, asegurándote de saber qué notas caen *juntas* y cuáles caen *entre los pulsos*.

#### 2. El Patrón "Bajo + Acorde"
- **Mano Izquierda:** Toca C3 en el pulso 1 (grave).
- **Mano Derecha:** Toca la tríada C4-E4-G4 en los pulsos 2, 3 y 4.
    `,
  dictationScript: 'La independencia de manos no se logra a los tirones, sino con paciencia y automatismo. La mano izquierda hace de bajista, marcando las notas graves bien firmes, mientras la derecha se encarga de los acordes o la melodía. El secreto acá es tocar ridículamente despacio. Si el cerebro se te traba, bajá la velocidad a la mitad y respirá hondo. Tranqui, que con constancia sale seguro.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuál es la estrategia pedagógica más efectiva cuando ambas manos se descoordinan en un ejercicio?',
          options: [
            'Tocar más rápido para que los dedos no piensen',
            'Tocar a velocidad sumamente lenta y practicar cada mano por separado primero',
            'Dejar de usar la mano izquierda',
            'Presionar los pedales con fuerza'
          ],
          correctIndex: 1,
          explanation: 'Practicar manos separadas y luego unir a velocidad hiperlenta permite consolidar la memoria motriz.'
        },
        {
          question: 'En un arreglo pianístico típico, ¿qué función cumple primordialmente la mano izquierda?',
          options: [
            'Tocar solos virtuosos en el registro sobreagudo',
            'Proveer la línea de bajo y los cimientos rítmico-armónicos',
            'Sostener el banco del piano',
            'Afinar las cuerdas'
          ],
          correctIndex: 1,
          explanation: 'La mano izquierda es el ancla armónica y rítmica del piano.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el bajo C3 y a continuación el acorde C4-E4-G4 de Do Mayor.',
        requiredSequence: ['C3', 'C4', 'E4', 'G4'],
        mode: 'sequence',
        hint: 'Bajo en la izquierda (C3) seguido del acorde en el centro (C4-E4-G4).'
      }
    },
  },
  '11b': {
  content: `
### La nota de arriba es la que se escucha

Cuando la mano derecha toca un acorde, el oído no escucha "un acorde": escucha la **nota más aguda** como melodía y el resto como color. Si tocás las tres con el mismo peso, la melodía desaparece y el resultado suena a alguien practicando.

#### 1. El gesto físico

No se toca "más fuerte con el 5". Se **apoya el peso del brazo sobre el meñique** y se deja que los otros dedos caigan solos, casi sin intención.

- La muñeca se inclina levemente hacia afuera, hacia el 5.
- El 5 llega al fondo de la tecla; el 1 y el 3 se quedan a mitad de camino.
- El acorde entra igual de junto: lo que cambia es el reparto del peso, no el tiempo.

#### 2. El ejercicio que lo enseña

Sobre Do-Mi-Sol con 1-3-5:

1. Tocá el acorde y escuchá si sobresale alguna nota. Casi siempre sobresale el pulgar, que es el dedo más pesado.
2. Ahora tocá el acorde **buscando que sólo se oiga el Sol**. Exagerá: que las otras dos apenas suenen.
3. Después al revés: que sólo se oiga el Do. Cuesta más, y por eso sirve.
4. Volvé al equilibrio 1: melodía arriba, acompañamiento abajo.

Grabate con el celular. Lo que creés que estás haciendo y lo que sale son dos cosas distintas hasta que te escuchás.

#### 3. Melodía tenida, acompañamiento repetido

El caso real: la melodía dura una blanca y el acompañamiento se mueve en corcheas, todo en la misma mano.

- El 5 **sostiene** su nota mientras el 1 y el 2 repiten abajo.
- La nota sostenida no se vuelve a tocar aunque el acompañamiento cambie de acorde.

Esto es la mitad de Chopin y de cualquier balada. Y es exactamente el mismo control que entrenaste en las notas tenidas de la independencia de dedos: una nota queda, otra se mueve.

#### 4. Dónde se nota

Probá el mismo compás dos veces: una con las tres notas parejas y otra con el 5 destacado. La diferencia no es de técnica, es de que en la segunda **hay una canción** y en la primera no.
    `,
  dictationScript: 'Acá viene el salto que separa a alguien que toca acordes de alguien que toca música. En un acorde de la mano derecha, la nota de arriba es la melodía y las de abajo son relleno. Si las tocás todas con el mismo peso, suena a ejercicio. El truco es viejo y es físico: apoyás el peso del brazo sobre el meñique y dejás que los demás dedos caigan casi solos. Que el cinco suene fuerte y los otros susurren. Al principio parece imposible, y a las dos semanas te sale sin pensarlo.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En un acorde de la mano derecha, ¿qué nota escucha el oído como melodía?',
          options: ['La más grave', 'La del medio', 'La más aguda', 'Las tres por igual'],
          correctIndex: 2,
          explanation: 'El oído toma la voz superior como melodía y el resto como armonía. Por eso destacar la nota de arriba es lo que hace que un acompañamiento suene a canción.'
        },
        {
          question: '¿Cómo se destaca la nota superior de un acorde?',
          options: [
            'Tocándola un instante después que las demás',
            'Apoyando el peso del brazo sobre el meñique y dejando caer los otros dedos casi solos',
            'Golpeando fuerte con el 5º dedo',
            'Tocando las otras notas una octava más abajo'
          ],
          correctIndex: 1,
          explanation: 'Es un reparto de peso, no un golpe ni un desfasaje: el acorde suena junto, pero el 5 llega al fondo y los otros dedos se quedan a mitad de camino.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el acorde de Do mayor con 1-3-5 (Do, Mi, Sol) buscando que el Sol sea lo que más se escuche.',
        requiredSequence: ['C4', 'E4', 'G4'],
        mode: 'chord',
        hint: 'Inclina apenas la muñeca hacia el meñique y dejá que el pulgar caiga solo.'
      }
    },
  },
  '11c': {
  content: `
### El pedal se cambia después, no antes

Los tres pedales, de derecha a izquierda: el **de resonancia** (levanta todos los apagadores; es el que se usa el 95 % del tiempo), el **tonal** o sostenuto (sostiene sólo lo que ya estaba hundido) y el **una corda** (corre la mecánica: suena más suave y más oscuro, no sólo más bajo).

#### 1. El pedal sincopado

La regla que ordena todo:

1. Tocás el acorde nuevo.
2. **Recién ahí** levantás el pedal.
3. Y lo volvés a pisar enseguida, todavía con el acorde sonando.

Levantar → pisar ocurre **después** del ataque, no con él. Si pisás junto con el acorde, el anterior queda adentro y los dos suenan mezclados. El movimiento del pie va a contratiempo de la mano; de ahí el nombre.

#### 2. Cuándo se cambia

**Cada vez que cambia la armonía.** Esa es la regla base y alcanza para el 90 % de los casos.

Además:

- Con **escalas o notas de paso** rápidas: pedal poco o nada, o cambios cada medio compás.
- Con el **bajo grave** hay que ser más estricto: los graves resuenan mucho más y ensucian antes.
- En un **arpegio de un solo acorde**, un pedal por acorde aunque dure cuatro compases: es el efecto que se busca.

#### 3. Medio pedal

El pedal no es un interruptor. Levantándolo **a medias** se cortan las frecuencias agudas y quedan los graves: sirve para limpiar sin perder el cuerpo del sonido. Es lo primero que se siente distinto en un piano de cola bueno, y también lo que un teclado con pedal de medio recorrido puede reproducir.

#### 4. Los dos errores de siempre

- **Pedal para tapar.** Si el legato no está en los dedos, el pedal no lo arregla: sólo lo hace más ruidoso. Estudiá el pasaje **sin pedal** hasta que las notas se unan solas, y recién ahí agregalo.
- **El pie que se queda.** Cambiar el pedal es un gesto activo y constante. Si te olvidás del pie, en cuatro compases tenés todas las notas de la frase sonando a la vez.

#### 5. Cómo se practica

Un acorde por compás, lento, mirando el pie: **tocar — levantar — pisar**. Cuando eso salga sin pensarlo, ponele una melodía encima. El oído tiene que aprender a escuchar la suciedad; una vez que la escucha, el pie se corrige solo.
    `,
  dictationScript: 'El pedal es el que hace que un piano suene a piano, y también el que ensucia todo cuando se usa mal. La regla es una sola y es contraintuitiva: el pedal no se pisa junto con el acorde, se cambia justo DESPUÉS de que el acorde sonó. Tocás, y recién ahí levantás y volvés a pisar. Eso se llama pedal sincopado y es el noventa por ciento de lo que hay que saber. Si pisás al mismo tiempo, arrastrás el acorde anterior y queda todo embarrado. Y acordate: el pedal no sirve para tapar un legato que no hiciste con los dedos.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuándo se cambia el pedal de resonancia?',
          options: [
            'Justo antes de tocar el acorde nuevo',
            'Al mismo tiempo que el acorde nuevo',
            'Justo después de tocar el acorde nuevo',
            'Una vez por compás, siempre'
          ],
          correctIndex: 2,
          explanation: 'Es el pedal sincopado: tocás, y recién ahí levantás y volvés a pisar. Si el cambio ocurre junto con el ataque, el acorde anterior queda adentro y se mezcla.'
        },
        {
          question: 'Un pasaje legato no te sale unido. ¿Qué hacés?',
          options: [
            'Le ponés más pedal',
            'Lo estudiás sin pedal hasta que las notas se unan con los dedos, y después agregás el pedal',
            'Tocás más rápido para que no se note',
            'Cambiás la digitación al azar'
          ],
          correctIndex: 1,
          explanation: 'El pedal amplifica lo que hay, no lo arregla. Un legato tapado con pedal suena a legato sucio, no a legato.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá dos acordes seguidos, imaginando el cambio de pedal después de cada uno: primero Do (Do-Mi-Sol) y después Fa (Fa-La-Do).',
        requiredSequence: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5'],
        mode: 'sequence',
        hint: 'Tocás el acorde, y recién con el sonido ya arriba levantás y volvés a pisar.'
      }
    },
  },
  '12': {
  content: `
### La Cuarta Dimensión Armónica: Séptimas 

Un acorde de 7ma se forma añadiendo una tercera más sobre la quinta de una tríada (cuatro notas en total).

#### 1. Do Séptima Mayor (Cmaj7)
- **Do - Mi - Sol - Si (C-E-G-B)**
- Tiene una 7ma mayor (11 semitonos desde la raíz).
- Sonido: Soñador, cinematográfico, relajante.

#### 2. Do Séptima Dominante (C7)
- **Do - Mi - Sol - Si♭ (C-E-G-Bb)**
- Tiene una 7ma menor (10 semitonos).
- Sonido: Bluesero, tenso, pide resolver a Fa Mayor.

#### 3. Do Menor Séptima (Cm7)
- **Do - Mi♭ - Sol - Si♭ (C-Eb-G-Bb)**
- Sonido: Neo-Soul, íntimo, reflexivo.
    `,
  dictationScript: 'Las tríadas son sólidas y directas, pero los acordes de séptima tienen perfume y elegancia pura, che. Agregarle una cuarta nota a la tríada te abre la puerta al Jazz, a la Bossa Nova y al Soul. Tenés la séptima mayor o Maj7, que suena soñadora y cinematográfica; la séptima dominante, con esa tensión del Blues; y la séptima menor, suave como una seda. Escuchá la riqueza que tienen.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué notas integran el acorde de Do Séptima Mayor (Cmaj7)?',
          options: [
            'C - E - G - A',
            'C - E - G - B (Do, Mi, Sol, Si)',
            'C - E - G - D',
            'C - D# - G - B'
          ],
          correctIndex: 1,
          explanation: 'Cmaj7 añade la séptima natural (Si) a la tríada mayor de Do.'
        },
        {
          question: '¿Qué sensación auditiva evoca típicamente el acorde Maj7?',
          options: [
            'Agresiva y chirriante',
            'Soñadora, cálida y cinematográfica',
            'Fúnebre y oscura',
            'Cómica y circense'
          ],
          correctIndex: 1,
          explanation: 'El intervalo de séptima mayor aporta una suave tensión luminosa muy usada en bandas sonoras y Lo-Fi.'
        }
      ],
      practicalTask: {
        instruction: 'Toca el acorde completo de Cmaj7 simultáneamente: C4, E4, G4 y B4.',
        requiredSequence: ['C4', 'E4', 'G4', 'B4'],
        mode: 'chord',
        hint: 'Tríada de Do Mayor más el Si natural con el dedo 5.'
      }
    },
  },
  '12b': {
  content: `
### Cuatro notas, cuatro bajos posibles

| Posición | Bajo | Cifrado | Cómo suena |
|---|---|---|---|
| Fundamental | la fundamental | G7 | firme, empuja |
| 1ª inversión | la 3ª | G7/B | más liviana |
| 2ª inversión | la 5ª | G7/D | inestable |
| **3ª inversión** | **la 7ª** | **G7/F** | pide bajar |

#### 1. Por qué la tercera inversión es la que más aparece

La séptima **quiere bajar un semitono**. Si la ponés en el bajo, esa tendencia queda a la vista:

**G7/F → C/E**  → el bajo hace Fa → Mi, medio tono, y la resolución suena inevitable.

Es el recurso favorito de la música de cine, del bolero y de cualquier arreglo donde el bajo tenga que caminar en vez de saltar.

#### 2. Sacale la quinta

Con cuatro notas en la mano derecha, un acorde de séptima en posición cerrada suena a barro. La **quinta es la nota que menos aporta**: no define si es mayor o menor (eso lo hace la 3ª) ni el color de séptima (eso lo hace la 7ª).

Sacala. **G7 en la derecha = Sol, Si, Fa** — y el Re, si querés, que lo ponga la izquierda. Suena más limpio y deja la mano libre.

Ese es el paso previo a los shell voicings que vienen en el módulo 5.

#### 3. Encadenar séptimas sin saltar

La misma regla de siempre —usar la inversión más cercana— rinde el doble con séptimas, porque hay más notas en común:

**Dm7 → G7 → Cmaj7**, todo en la zona del Do central, moviendo lo mínimo. La séptima de un acorde baja un semitono y se convierte en la tercera del siguiente. Una sola voz se mueve por acorde.

#### 4. Cómo reconocerlas de un vistazo

En posición cerrada, la séptima deja **dos notas pegadas** (a distancia de segunda) en algún lugar del acorde. Dónde queda ese par te dice la posición:

- Par **arriba de todo** → posición fundamental (la 7ª y la 8ª).
- Par **abajo de todo** → tercera inversión (la 7ª está en el bajo y la fundamental arriba de ella).

Es el mismo truco que la regla de la cuarta para las tríadas, con el intervalo de segunda en vez del de cuarta.
    `,
  dictationScript: 'Una tríada tiene tres caras; una séptima tiene cuatro, porque hay una nota más para mandar al bajo. Y la cuarta, la tercera inversión, es la más útil de todas: poné la séptima abajo y el acorde queda pidiendo bajar un semitono. Sol siete con Fa en el bajo va a Do con Mi en el bajo, y el bajo camina de Fa a Mi. Ese medio tono es el sonido de la música de cine y de medio bolero. Y una cosa práctica: cuando toques séptimas en la derecha, sacá la quinta. Con cuatro notas apretadas suena a barro; con tres, suena.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota está en el bajo en un G7/F?',
          options: ['Sol', 'Si', 'Re', 'Fa'],
          correctIndex: 3,
          explanation: 'Lo que va después de la barra es el bajo. Fa es la séptima de G7, así que es la tercera inversión, la que resuelve bajando un semitono a Mi.'
        },
        {
          question: 'Tocando un acorde de séptima con la mano derecha, ¿qué nota conviene sacar?',
          options: [
            'La fundamental',
            'La tercera',
            'La quinta',
            'La séptima'
          ],
          correctIndex: 2,
          explanation: 'La quinta no define ni el modo (eso lo hace la 3ª) ni el color de séptima (eso lo hace la 7ª). Es la primera que se saca para que el acorde no suene embarrado.'
        }
      ],
      practicalTask: {
        instruction: 'Armá G7 en posición fundamental sin la quinta: Sol, Si, Fa.',
        requiredSequence: ['G4', 'B4', 'F5'],
        mode: 'chord',
        hint: 'Fundamental, tercera y séptima. El Re se lo dejás a la mano izquierda.'
      }
    },
  },
  '12c': {
  content: `
### Lo que sobra del acorde es lo que hace la melodía

Una melodía hecha sólo con las notas del acorde es un arpegio. Lo que la convierte en música son las **notas extrañas**: las que no pertenecen al acorde y se resuelven en una que sí.

#### 1. Nota de paso

Conecta dos notas del acorde llenando el hueco, en **tiempo débil**.

Sobre un acorde de Do: **Do – Re – Mi**. El Re no está en el acorde; sólo pasa. Si lo tocás en tiempo fuerte y lo sostenés, deja de ser de paso y se vuelve otra cosa.

#### 2. Bordadura

Sale de una nota del acorde, se va a la vecina y **vuelve a la misma**: Mi – Fa – Mi, o Mi – Re – Mi. Es una vueltita, y también va en tiempo débil.

Superior o inferior según hacia dónde salga. La inferior a semitono es la que suena "clásica".

#### 3. Apoyatura — la que emociona

Cae en **tiempo fuerte** sobre una nota que no es del acorde, y **después** baja (casi siempre) a la que sí.

Sobre un acorde de Do, en el tiempo 1: suena **Fa** y recién en el 2 baja a **Mi**. Esa disonancia de un instante en el lugar más expuesto del compás es de donde sale la emoción de casi toda melodía que te guste.

Es la diferencia entre una melodía correcta y una que te agarra.

#### 4. Retardo

Igual que la apoyatura, pero la nota disonante **ya venía sonando** del acorde anterior y se queda un momento antes de resolver. La sensación es de algo que se resiste a soltar. Está en todo el barroco y en todas las baladas.

#### 5. Cómo se usa esto en la práctica

Cuando sacás un tema de oído y una nota "no entra" en el acorde, casi nunca te equivocaste de acorde: es una nota extraña. Preguntate **adónde va** —la nota siguiente casi siempre es del acorde— y ahí tenés la armonía.

Y al revés, para componer: agarrá un arpegio simple y metele una apoyatura en cada tiempo fuerte. La misma progresión pasa de ejercicio a canción.
    `,
  dictationScript: 'Si una melodía usara sólo las notas del acorde, sonaría a arpegio y a nada más. Lo que la vuelve melodía son las notas que NO están en el acorde. La nota de paso es la que conecta dos notas del acorde caminando por el medio, y va en tiempo débil. La bordadura sale y vuelve a la misma nota, como una vueltita. Y la apoyatura, que es la más linda, cae en tiempo FUERTE sobre una nota que no es del acorde y recién después resuelve. Esa disonancia breve en el tiempo fuerte es el noventa por ciento de la emoción de una melodía.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué distingue a una apoyatura de una nota de paso?',
          options: [
            'La apoyatura es más rápida',
            'La apoyatura cae en tiempo fuerte y la nota de paso en tiempo débil',
            'La nota de paso siempre sube y la apoyatura baja',
            'No hay diferencia real'
          ],
          correctIndex: 1,
          explanation: 'La posición métrica es lo que las separa. Esa disonancia en el tiempo fuerte, que después resuelve, es lo que da la carga expresiva.'
        },
        {
          question: 'Estás sacando un tema y una nota de la melodía no entra en el acorde que pusiste. ¿Qué es lo más probable?',
          options: [
            'Que el acorde esté mal',
            'Que sea una nota extraña que resuelve en la siguiente',
            'Que el tema cambie de tonalidad ahí',
            'Que la grabación esté desafinada'
          ],
          correctIndex: 1,
          explanation: 'Mirá la nota que sigue: casi siempre es del acorde. Las notas extrañas son la norma en una melodía, no la excepción.'
        }
      ],
      practicalTask: {
        instruction: 'Sobre un acorde de Do, tocá Do, Re, Mi: el Re es la nota de paso que conecta las dos notas del acorde.',
        requiredSequence: ['C4', 'D4', 'E4'],
        mode: 'sequence',
        hint: 'La del medio no está en el acorde de Do: sólo pasa, y por eso va liviana.'
      }
    },
  },
  '12d': {
  content: `
### De una melodía sola a un acompañamiento

#### 1. Averiguá la tonalidad

- La **última nota** de la melodía es casi siempre la tónica.
- Las alteraciones que aparecen te dan la armadura.
- Si suena luminosa, mayor; si suena sombría, su relativa menor.

#### 2. Escribí tus candidatos

Los siete acordes de esa tonalidad. En Do: **C, Dm, Em, F, G, Am, Bdim**. Al principio no necesitás nada más: el 90 % de las canciones populares se armonizan sin salir de ahí.

#### 3. Elegí por la nota importante de cada compás

No mires todas las notas: mirá **la que cae en el tiempo fuerte y la que más dura**. Después preguntate qué acordes la contienen.

Si el compás gira alrededor del **Mi**, los candidatos son **C** (Do-Mi-Sol), **Am** (La-Do-Mi) y **Em** (Mi-Sol-Si). Los tres "entran". Elegís por función: si es el final de la frase, el I; si querés que siga, el vi.

#### 4. Las tres reglas que evitan el 90 % de los errores

1. **Un acorde por compás** para empezar. Cambiar más seguido complica sin mejorar.
2. **Empezá y terminá en el I.** Nada suena más raro que una canción que no vuelve a casa.
3. **Antes del final, el V.** La cadencia V–I cierra; sin ella la frase queda colgando.

#### 5. Después, el color

Cuando la versión simple funciona, recién ahí:

- Cambiá un **I por un vi** en el medio de la frase: misma función, otro clima.
- Metele una **séptima al V**: empuja más.
- Usá **inversiones** para que el bajo camine en vez de saltar.

Ese es todo el trabajo de un arreglador, y se hace en ese orden: primero que funcione, después que suene lindo.

#### 6. El único juez

Tocá las dos o tres opciones y escuchá. La tabla te dice qué es **posible**; el oído te dice qué es **mejor**. Si dudás entre dos acordes que ambos entran, no hay respuesta correcta: hay dos versiones distintas de la canción.
    `,
  dictationScript: 'Te silban una melodía y tenés que acompañarla. Parece magia y es un método. Primero: averiguá la tonalidad mirando la última nota y las alteraciones. Segundo: escribí los siete acordes de esa tonalidad, que son tus únicos candidatos al principio. Tercero, y este es el truco: para cada compás, fijate qué acorde contiene la nota más importante, la que cae en el tiempo fuerte y la que dura más. Casi siempre hay dos o tres que sirven y elegís por función. Y cuarto: probá. El oído decide, no la tabla.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'Para elegir el acorde de un compás, ¿en qué nota de la melodía te fijás?',
          options: [
            'En la primera que aparece, siempre',
            'En la que cae en tiempo fuerte y la que más dura',
            'En la más aguda',
            'En todas por igual'
          ],
          correctIndex: 1,
          explanation: 'Las notas métricamente fuertes y largas son las que el oído toma como estructurales; el resto suelen ser notas extrañas de paso.'
        },
        {
          question: 'La melodía del compás gira alrededor del Mi, en Do mayor. ¿Qué acordes son candidatos?',
          options: [
            'Sólo Do mayor',
            'Do, La menor y Mi menor',
            'Fa y Sol',
            'Cualquiera: da lo mismo'
          ],
          correctIndex: 1,
          explanation: 'Los tres contienen el Mi. Cuál usar se decide por función: el I para cerrar, el vi para seguir, el iii para un color más raro.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el acorde con el que cerrarías una melodía en Do mayor: Do, Mi, Sol.',
        requiredSequence: ['C4', 'E4', 'G4'],
        mode: 'chord',
        hint: 'Se empieza y se termina en el I. Es la regla que menos falla.'
      }
    },
  },
  '13': {
  content: `
### La Brújula del Compositor 

El Círculo de Quintas organiza visualmente las 12 notas de la escala cromática por afinidad armónica.

#### 1. El Sentido Horario (Las Quintas y Sostenidos #)
Avanzando 7 semitonos (una 5ta justa):
- **C:** 0 sostenidos.
- **G:** 1 sostenido (**F#**).
- **D:** 2 sostenidos (**F#, C#**).
- **A:** 3 sostenidos (**F#, C#, G#**).
- **E:** 4 sostenidos (**F#, C#, G#, D#**).

#### 2. El Sentido Antihorario (Las Cuartas y Bemoles ♭)
- **F:** 1 bemol (**B♭**).
- **B♭:** 2 bemoles (**B♭, E♭**).
- **E♭:** 3 bemoles (**B♭, E♭, A♭**).

#### 3. Proximidad Armónica
Los acordes que están juntos en el círculo comparten casi todas sus notas. Si compones una canción en Do, los acordes vecinos (Fa y Sol, junto con sus relativos Dm, Am, Em) son tu paleta segura de colores.
    `,
  dictationScript: 'El Círculo de Quintas es la brújula sagrada de los músicos. Si te movés en sentido horario, cada parada está a una distancia de quinta justa y le suma un sostenido a la armadura. Do Mayor no tiene alteraciones, Sol tiene un Fa sostenido, Re tiene dos. Y adentro tenés las tonalidades relativas menores. Con esta brújula en la cabeza podés transportar cualquier canción al tono que te pida un cantante.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuántos sostenidos (#) tiene la armadura de la tonalidad de Sol Mayor (G)?',
          options: ['0 sostenidos', '1 sostenido (F#)', '3 sostenidos', '7 sostenidos'],
          correctIndex: 1,
          explanation: 'Sol Mayor es la primera parada horaria desde Do en el círculo y añade un único sostenido: Fa sostenido (F#).'
        },
        {
          question: '¿Qué tonalidad se encuentra a una quinta justa ascendente de Sol (G)?',
          options: ['Fa (F)', 'Re (D)', 'Mi (E)', 'Do (C)'],
          correctIndex: 1,
          explanation: 'Avanzando 7 semitonos desde Sol llegamos a Re (D).'
        }
      ],
      practicalTask: {
        instruction: 'Toca la secuencia de quintas iniciales del círculo: C4 → G4 → D5.',
        requiredSequence: ['C4', 'G4', 'D5'],
        mode: 'sequence',
        hint: 'Do (0 #) → Sol (1 #) → Re (2 #).'
      }
    },
  },
  '13b': {
  content: `
### Un dominante prestado

El V empuja hacia el I. La idea de la dominante secundaria es simple: **cualquier grado de la tonalidad puede recibir su propio V**, aunque ese acorde no pertenezca a la tonalidad.

Se escriben con una barra: **V/V** ("cinco de cinco"), V/vi, V/ii, V/IV.

#### 1. Cómo se arma

Elegí el acorde al que querés llegar, tratalo por un instante como si fuera la tónica, y ponele adelante su dominante con séptima.

| Querés llegar a | Su dominante | En Do mayor |
|---|---|---|
| V (Sol) | V/V | **D7** |
| vi (Am) | V/vi | **E7** |
| ii (Dm) | V/ii | **A7** |
| IV (Fa) | V/IV | **C7** |

#### 2. Qué las delata

Traen **una alteración que no está en la armadura**. D7 en Do mayor lleva Fa♯; E7 lleva Sol♯. Esa nota de más es exactamente lo que hace que el oído sienta que algo se abrió.

Cuando estés sacando un tema y aparezca un acorde mayor donde "debería" haber uno menor —un Re mayor donde esperabas Re menor— casi siempre es una dominante secundaria, y el acorde que viene después te dice de quién.

#### 3. Dónde se escucha

- **C – A7 – Dm – G7 – C**: el A7 es V/ii. Es la progresión de medio bolero y de medio jazz.
- **C – E7 – Am**: el E7 es V/vi. Un solo acorde y la frase se pone dramática.
- **C – C7 – F**: el C7 es V/IV. Es el giro del gospel y del blues.

#### 4. El ii-V del grado prestado

El paso siguiente: si un grado puede tener su V, también puede tener su **ii-V** completo.

Para llegar a Dm: **Em7♭5 – A7 – Dm**. Eso es lo que hacen los standards de jazz todo el tiempo, y por eso una hoja de acordes parece llena de acordes "raros" que en realidad son cadenas de ii-V apuntando a distintos grados.

#### 5. La regla práctica

No metas una dominante secundaria en cualquier lado: metela **justo antes del acorde al que apunta**. Su gracia es la expectativa, y la expectativa sólo funciona si se cumple enseguida.
    `,
  dictationScript: 'Ya sabés que el cinco tira hacia el uno. Bueno: cualquier acorde de la tonalidad puede tener su propio cinco, prestado por un rato. Eso es una dominante secundaria. En Do, si querés llegar al Sol con más fuerza, ponele adelante su propia dominante, que es Re séptima. Re séptima no pertenece a Do mayor, tiene un Fa sostenido que se lo pide prestado a otra tonalidad, y por eso suena a que algo se abrió. Es el recurso más barato y más efectivo que hay para que una progresión de cuatro acordes deje de sonar a las mismas cuatro de siempre.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En Do mayor, ¿cuál es la dominante secundaria del V (V/V)?',
          options: ['G7', 'D7', 'A7', 'E7'],
          correctIndex: 1,
          explanation: 'El V de Do es Sol; la dominante de Sol es Re con séptima. D7 lleva Fa♯, que no está en Do mayor: esa alteración es lo que la delata.'
        },
        {
          question: 'Sacando un tema en Do aparece un Mi mayor donde esperabas Mi menor. ¿Qué es lo más probable?',
          options: [
            'Que el tema haya cambiado de tonalidad',
            'Que sea una dominante secundaria (V/vi) y el acorde siguiente sea La menor',
            'Que estés escuchando mal',
            'Que sea un error del arreglo'
          ],
          correctIndex: 1,
          explanation: 'Un acorde mayor donde la tonalidad pide uno menor casi siempre es una dominante secundaria. El acorde que viene después dice a quién apuntaba.'
        }
      ],
      practicalTask: {
        instruction: 'Armá el V/V de Do mayor: Re, Fa♯, La, Do.',
        requiredSequence: ['D4', 'F#4', 'A4', 'C5'],
        mode: 'chord',
        hint: 'Re con séptima. El Fa va sostenido: esa es la nota prestada.'
      }
    },
  },
  '14': {
  content: `
### Pintando con Colores Armónicos Avanzados 

Los acordes básicos son blanco y negro; las extensiones son toda la gama cromática.

#### 1. Acorde Suspendido 4 (Csus4)
- **Do - Fa - Sol (C-F-G)**
- La tercera (Mi) es reemplazada por la cuarta (Fa).
- Produce una tensión maravillosa que pide resolver al Mi natural de Do Mayor.

#### 2. Acorde Suspendido 2 (Csus2)
- **Do - Re - Sol (C-D-G)**
- Espacioso, moderno, utilizado en baladas épicas.

#### 3. Acorde con Novena Añadida (Cadd9)
- **Do - Mi - Sol - Re agudo (C-E-G-D5)**
- Es el acorde estrella de la música acústica y pop.
    `,
  dictationScript: 'Fijate qué interesante: a veces queremos generar suspenso sin definir si el acorde es alegre o triste. Para eso usamos los acordes suspendidos: Sus4 y Sus2. Al cambiar la tercera por la cuarta o por la segunda, queda flotando en el aire como si contuviera la respiración. Y si le sumás la novena, lográs ese brillo cristalino moderno que queda bárbaro. Escuchá cómo respira la armonía.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En un acorde suspendido como Csus4, ¿qué nota de la tríada original es sustituida?',
          options: [
            'La raíz (Do)',
            'La tercera (Mi se reemplaza por Fa)',
            'La quinta (Sol se elimina)',
            'El bajo'
          ],
          correctIndex: 1,
          explanation: 'La suspensión consiste exactamente en postergar la tercera usando la cuarta (Fa) en su lugar.'
        },
        {
          question: '¿Qué notas forman el acorde Csus2 en Do?',
          options: [
            'C - E - G',
            'C - D - G (Do, Re, Sol)',
            'C - F - G',
            'C - D# - G'
          ],
          correctIndex: 1,
          explanation: 'Csus2 contiene la fundamental (Do), la segunda mayor (Re) y la quinta justa (Sol).'
        }
      ],
      practicalTask: {
        instruction: 'Toca la resolución clásica: primero Csus4 (C4, F4, G4) y luego resuelve a C Mayor (C4, E4, G4).',
        requiredSequence: ['C4', 'F4', 'G4', 'C4', 'E4', 'G4'],
        mode: 'sequence',
        hint: 'Escucha cómo la tensión de F4 descansa plácidamente en E4.'
      }
    },
  },
  '14b': {
  content: `
### La quinta sobra

En un acorde de séptima, la **quinta** es la nota más prescindible: sacala y el acorde sigue siendo el mismo. Lo que define el color son la **3ª** y la **7ª**. Se llaman **guide tones** —notas guía— porque son las que conducen la armonía de un acorde al siguiente.

- La **3ª** dice si es mayor o menor.
- La **7ª** dice si es de dominante, mayor o menor.

Con esas dos ya está dicho todo lo esencial.

#### 1. El shell voicing: tres notas

**Fundamental + 3ª + 7ª.** Nada más. Es el voicing con el que Bud Powell y Red Garland sostenían la izquierda mientras la derecha improvisaba.

| Forma | Estructura | Mano izquierda | Mano derecha |
|---|---|---|---|
| **A** | 1 - 7 - 3 | raíz + 7ª | 3ª |
| **B** | 1 - 3 - 7 | raíz + 3ª | 7ª |

**Alternar A y B es lo que te mantiene en el centro del teclado**: si usás siempre la misma forma, la progresión te empuja hacia arriba o hacia abajo hasta salirte del registro útil.

#### 2. El movimiento que sostiene todo el jazz

**La 7ª de cada acorde baja un semitono y se convierte en la 3ª del siguiente.** Un ii-V-I en Do, con shells:

| Acorde | Forma | Notas | Guide tones (voces de arriba) |
|---|---|---|---|
| **Dm7** | A (1-7-3) | Re · **Do** · **Fa** | Do (7ª) y Fa (3ª) |
| **G7** | B (1-3-7) | Sol · **Si** · **Fa** | Si (3ª) y Fa (7ª) |
| **Cmaj7** | A (1-7-3) | Do · **Si** · **Mi** | Si (7ª) y Mi (3ª) |

Seguí las dos voces de arriba: **Do-Fa → Si-Fa → Si-Mi**.

- El **Do** de Dm7 (su 7ª) baja medio tono al **Si** de G7 (su 3ª).
- El **Fa** se queda quieto: era la 3ª de Dm7 y pasa a ser la 7ª de G7.
- El **Fa** de G7 (su 7ª) baja medio tono al **Mi** de Cmaj7 (su 3ª), y el **Si** se queda.

**En cada cambio se mueve una sola voz, y se mueve un semitono.** Eso es todo. Ese medio tono es el sonido del jazz; el resto es decoración.

#### 3. El paso siguiente: voicings sin raíz

Cuando hay bajista, la raíz sobra: la deja él. Ahí aparecen los **rootless voicings** de Bill Evans —3-5-7-9 y 7-9-3-5—, que son literalmente inversiones de un acorde de cuatro notas sin la fundamental. Todo lo que aprendiste sobre inversiones se aplica igual; solo cambió cuál es la nota de abajo.

#### 4. El ejercicio de mayor rendimiento por minuto

**Solo los guide tones, dos notas por acorde, mano derecha sola, sin raíz, ii-V-I por las doce tonalidades.**

- Bajando por quintas: Do, Fa, Si♭, Mi♭, La♭, Re♭, Sol♭, Si, Mi, La, Re, Sol.
- Dos notas por acorde. Escuchá el semitono que baja en cada cambio.
- Después agregá la raíz en la izquierda: ahí ya estás tocando jazz.

Nada más rinde tanto por minuto invertido: es armonía, oído, voice leading y las doce tonalidades en un solo ejercicio.
    `,
  dictationScript: 'Última pieza del rompecabezas. En un acorde de séptima, la quinta no dice nada: se puede sacar sin que nadie la extrañe. Lo que define el color son la tercera y la séptima, los guide tones. Tocá solo raíz, tercera y séptima: eso es un shell voicing, y es lo que tocaban Bud Powell y Red Garland con la izquierda. Y ahora el secreto: en un dos-cinco-uno, la séptima de cada acorde baja medio tono y se convierte en la tercera del siguiente. Ese medio tono es el sonido del jazz. Todo lo demás es decoración.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué nota se puede quitar de un acorde de séptima sin perder su identidad?',
          options: ['La fundamental', 'La tercera', 'La quinta', 'La séptima'],
          correctIndex: 2,
          explanation: 'La quinta no aporta color: no distingue mayor de menor ni de dominante. La 3ª y la 7ª —los guide tones— son las que definen el acorde.'
        },
        {
          question: 'En un ii-V-I, ¿qué le pasa a la 7ª de cada acorde?',
          options: [
            'Se queda quieta',
            'Baja un semitono y se convierte en la 3ª del acorde siguiente',
            'Sube una octava',
            'Se reemplaza por la quinta'
          ],
          correctIndex: 1,
          explanation: 'La 7ª resuelve bajando medio tono a la 3ª del acorde siguiente: Do de Dm7 → Si de G7, y Fa de G7 → Mi de Cmaj7. Ese semitono es el motor del voice leading en el jazz.'
        },
        {
          question: '¿Por qué conviene alternar la forma A (1-7-3) con la forma B (1-3-7)?',
          options: [
            'Porque suenan distinto',
            'Para que la progresión no te empuje fuera del registro útil del teclado',
            'Porque la forma A es solo para acordes menores',
            'Para poder tocar más rápido'
          ],
          correctIndex: 1,
          explanation: 'Usando siempre la misma forma, cada acorde te desplaza en la misma dirección. Alternando A y B las manos se quedan en el centro del teclado.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el shell voicing de Dm7 en forma A (1-7-3): Re grave, Do y Fa (D3, C4, F4).',
        requiredSequence: ['D3', 'C4', 'F4'],
        mode: 'chord',
        hint: 'Sin quinta: raíz abajo, la séptima (Do) y la tercera (Fa) arriba. Escuchá cómo el Do pide bajar al Si.'
      }
    },
  },
  '14c': {
  content: `
### Dejar de tocar lo que ya suena

#### 1. Sin fundamental

Si la mano izquierda —o un bajista— ya toca la fundamental, repetirla arriba no aporta nada y ocupa un dedo. **Sacala** y usá ese lugar para una tensión.

**Dm7** en la derecha, sin fundamental: **Fa – La – Do – Mi** (3-5-7-9). Sigue siendo Dm7 con toda claridad, y encima suena más abierto.

Lo que **no** se puede sacar es la 3ª (define mayor o menor) ni la 7ª (define el color). Ese es el esqueleto, y ya lo conocés de los guide tones.

#### 2. Las dos formas que resuelven un ii-V-I

Para **Dm7 – G7 – Cmaj7**, mano derecha sola:

- **Forma A** (empieza con la 3ª abajo): Dm7 → Fa La Do Mi · G7 → Fa La Si Re · Cmaj7 → Mi Sol La Re
- **Forma B** (empieza con la 7ª abajo): Dm7 → Do Mi Fa La · G7 → Si Re Mi Sol · Cmaj7 → Si Re Mi Sol

Se alternan A y B para no irse del registro cómodo, exactamente como con los shell voicings. Fijate cuánto se mueve cada voz entre acorde y acorde: casi nada. Eso es lo que hace que suene profesional.

#### 3. A dos manos

Otra forma de repartirlo:

- **Izquierda**: fundamental y séptima (o fundamental y tercera). Dos notas, no más.
- **Derecha**: 3ª, 7ª y las tensiones (9, 11, 13).

El acorde queda espaciado en vez de apretado, y cada mano tiene poco que hacer.

#### 4. La regla del registro grave

Debajo del Do central, los intervalos chicos suenan **turbios**. Es física, no gusto: los armónicos de dos notas cercanas se pisan y el oído no las separa.

- En el grave: **quintas y octavas**, o la fundamental sola.
- Las terceras y segundas, del Do central para arriba.

Un acorde de cuatro notas apretadas dos octavas abajo del Do central suena a barro por bueno que sea el piano. Es el error número uno de quien recién arranca a hacer voicings.

#### 5. Cómo se practica

Un ii-V-I en las doce tonalidades, con la forma A, lento. Después con la forma B. Después alternando. No hay atajo, pero tampoco es mucho: son doce, y la forma es siempre la misma.
    `,
  dictationScript: 'Dos ideas que cambian el sonido de golpe. La primera: si hay un bajista, o si tu mano izquierda ya toca la fundamental, la derecha no tiene por qué repetirla. Sacala y poné en su lugar la novena o la trecena. Eso son los voicings sin fundamental y es el sonido del jazz moderno. La segunda: repartí el acorde entre las dos manos, con la izquierda tomando la fundamental y la séptima y la derecha las tensiones arriba. Y una regla física que vale para todo: abajo del Do central, nada de intervalos chicos. Dos notas apretadas en el grave suenan a barro, siempre.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: 'En un voicing sin fundamental, ¿qué dos notas no se pueden sacar nunca?',
          options: [
            'La fundamental y la quinta',
            'La tercera y la séptima',
            'La quinta y la novena',
            'La tercera y la quinta'
          ],
          correctIndex: 1,
          explanation: 'La 3ª define si es mayor o menor y la 7ª el color del acorde. La fundamental la cubre el bajo y la 5ª no aporta información.'
        },
        {
          question: '¿Por qué no conviene tocar acordes cerrados en el registro grave?',
          options: [
            'Porque el piano suena más bajo ahí',
            'Porque los armónicos de notas cercanas se pisan y el oído no las separa: suena turbio',
            'Porque la mano izquierda es más débil',
            'Porque no se puede usar pedal'
          ],
          correctIndex: 1,
          explanation: 'Es física del sonido, no gusto. En el grave van quintas, octavas o la fundamental sola; las terceras y segundas del Do central para arriba.'
        }
      ],
      practicalTask: {
        instruction: 'Armá un Dm7 sin fundamental en la mano derecha: Fa, La, Do, Mi.',
        requiredSequence: ['F4', 'A4', 'C5', 'E5'],
        mode: 'chord',
        hint: 'Tercera, quinta, séptima y novena. El Re lo pone el bajo.'
      }
    },
  },
  '14d': {
  content: `
### Dos dominantes que dicen lo mismo

**G7** contiene Si y Fa. **D♭7** contiene Fa y Do♭ (que es Si). Las mismas dos notas, dadas vuelta.

Esas dos notas —la 3ª y la 7ª— son las que definen un acorde de dominante y las que forman su tritono. Como el tritono divide la octava en dos mitades iguales, **es simétrico**: se puede leer desde cualquiera de sus dos notas. Por eso G7 y D♭7 pueden reemplazarse.

La raíz del sustituto está siempre **a un tritono** (tres tonos) de la original, o —más fácil de encontrar— **un semitono arriba del acorde de destino**.

#### 1. Para qué sirve

Para que el bajo camine de a semitonos en vez de saltar de quinta.

| | Bajo |
|---|---|
| Dm7 – **G7** – Cmaj7 | Re → Sol → Do (saltos) |
| Dm7 – **D♭7** – Cmaj7 | Re → Re♭ → Do (semitonos) |

Es un cambio de una sola nota en el bajo, y la progresión pasa a sonar a jazz.

#### 2. Cómo encontrar el sustituto en un segundo

Mirá **el acorde al que va a resolver** y subí un semitono.

- Resuelve a **C** → sustituto **D♭7**.
- Resuelve a **F** → sustituto **G♭7**.
- Resuelve a **B♭** → sustituto **B7**.

No hace falta contar tritonos.

#### 3. La nota que hay que cuidar

Con el sustituto, la melodía puede chocar: la 9ª de G7 (La) es la ♭9 de D♭7, y no siempre suena bien. **Escuchá antes de reemplazar.** La sustitución tritonal no es automática; es una opción.

#### 4. El ii-V sustituto completo

Se puede sustituir el V y **también traer su propio ii**:

**Dm7 – D♭7 – Cmaj7** funciona, y **A♭m7 – D♭7 – Cmaj7** funciona todavía mejor: el ii del sustituto acompaña al sustituto. Es lo que hace que un arreglo de bossa suene como suena.

#### 5. Dónde la vas a escuchar

En el turnaround de casi cualquier standard, en los finales de bossa nova, y en el segundo estribillo de mil canciones pop cuando el arreglador quiso que el mismo acorde sonara distinto la segunda vez.
    `,
  dictationScript: 'Este es de los trucos más elegantes que hay. Sol siete y Re bemol siete comparten las dos notas que importan: el Si y el Fa, que son la tercera y la séptima de uno y la séptima y la tercera del otro. Están a distancia de tritono y el tritono es simétrico, así que un acorde puede hacer el trabajo del otro. ¿Para qué sirve? Para que el bajo baje de a semitonos: en vez de Re menor, Sol, Do, hacés Re menor, Re bemol siete, Do, y el bajo camina Re, Re bemol, Do. Suena a jazz al toque, y es cambiar una sola nota del bajo.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué comparten G7 y D♭7?',
          options: [
            'La fundamental',
            'La tercera y la séptima, que son las mismas dos notas intercambiadas',
            'Las cuatro notas',
            'Nada: suenan igual por casualidad'
          ],
          correctIndex: 1,
          explanation: 'Si y Fa son la 3ª y la 7ª de G7, y la 7ª y la 3ª de D♭7. Ese tritono compartido es lo que permite el reemplazo.'
        },
        {
          question: 'Un dominante resuelve a Fa mayor. ¿Cuál es su sustituto tritonal?',
          options: ['B7', 'G♭7', 'D♭7', 'E7'],
          correctIndex: 1,
          explanation: 'El sustituto está siempre un semitono arriba del acorde de destino. Arriba de Fa está Sol♭, así que Sol♭7.'
        }
      ],
      practicalTask: {
        instruction: 'Armá el sustituto tritonal de G7 (el que resuelve a Do): Do♯/Re♭, Fa, Sol♯/La♭, Si.',
        requiredSequence: ['C#4', 'F4', 'G#4', 'B4'],
        mode: 'chord',
        hint: 'Re♭ con séptima. Fijate que el Fa y el Si son los mismos que tenía G7.'
      }
    },
  },
  '14e': {
  content: `
### Mudarse de tonalidad

#### 1. Por acorde pivote — la elegante

Un acorde que existe en las dos tonalidades. Se toca con la función de la vieja y se sale con la función de la nueva.

**De Do mayor a Sol mayor.** El acorde de **Fa** es el IV de Do… pero no está en Sol. El de **Do** sí: es el I de Do y el **IV de Sol**. Entonces:

**C – Am – C(=IV de Sol) – D7 – G**

El oído no percibe un corte: percibe que la música llegó a otro lado. Es la modulación del clasicismo y de todo arreglo prolijo.

Cuanto más cerca estén las dos tonalidades en el círculo de quintas, más acordes en común hay y más suave sale.

#### 2. Por dominante — la directa

Sin pivote: se entra tocando la **dominante con séptima de la tonalidad nueva**.

Para ir a La mayor, tocás **E7** y ya estás. Es más brusca que el pivote, pero clarísima; el oído reconoce el V7 y acepta la nueva tónica sin discutir.

Con un **ii-V** delante sale todavía mejor: **Bm7 – E7 – A**.

#### 3. Directa, sin preparar — la del estribillo

Subir un semitono o un tono y seguir, sin acorde puente. Es la modulación del último estribillo de la balada, y funciona justamente porque es descarada: el salto **es** el efecto.

Sube la energía de golpe. Usada dos veces en el mismo tema, cansa.

#### 4. Cómo volver

Volver a la tonalidad original es igual de importante y se hace igual: pivote o dominante. Si la pieza se va y no vuelve, el oyente queda con la sensación de que faltó algo — salvo que ese sea el punto.

#### 5. Lo que decide si suena bien

**Que la melodía acompañe el cambio.** Una modulación perfecta en la armonía suena forzada si la melodía sigue como si nada. La nota que sostenés durante el cambio tiene que pertenecer a las dos tonalidades, o resolver hacia la nueva. Es la misma lógica del acorde pivote, aplicada a una sola voz.
    `,
  dictationScript: 'Modular es mudarse de tonalidad en el medio de un tema. Hay tres formas y conviene conocer las tres. La elegante es el acorde pivote: buscás un acorde que exista en las dos tonalidades, lo tocás como si fuera de la vieja y seguís como si fuera de la nueva. Nadie se da cuenta del cambio, sólo del efecto. La segunda es entrar por la dominante de la tonalidad nueva, más brusca pero clarísima. Y la tercera es la del estribillo final: subís un tono y listo, sin preparar nada. Descarada, pero funciona, y por algo la usan todos.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué es un acorde pivote?',
          options: [
            'Un acorde disminuido de paso',
            'Un acorde que pertenece a las dos tonalidades y sirve de bisagra',
            'El último acorde antes del cambio',
            'Un acorde sin fundamental'
          ],
          correctIndex: 1,
          explanation: 'Se entra tratándolo como acorde de la tonalidad vieja y se sale tratándolo como acorde de la nueva. Por eso el cambio no se percibe como un corte.'
        },
        {
          question: 'Querés modular a La mayor de la forma más directa y clara. ¿Qué acorde tocás?',
          options: ['A menor', 'E7', 'D7', 'C7'],
          correctIndex: 1,
          explanation: 'La dominante con séptima de la tonalidad nueva. El V7 de La es Mi con séptima, y el oído acepta la nueva tónica en cuanto lo escucha.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el acorde pivote que sirve para pasar de Do mayor a Sol mayor: Do, Mi, Sol (es el I de Do y el IV de Sol).',
        requiredSequence: ['C4', 'E4', 'G4'],
        mode: 'chord',
        hint: 'El mismo acorde con dos funciones distintas, una en cada tonalidad.'
      }
    },
  },
  '14f': {
  content: `
### La misma melodía, otros acordes

Reharmonizar es cambiar la armonía de una melodía que ya existe. Es lo que hace que la misma canción suene a jazz, a bossa o a cine sin que le muevan una nota a la melodía.

Las cuatro herramientas ya las viste todas por separado. Acá se usan juntas.

#### 1. Sustituir por función

Cambiá un acorde por otro de la **misma familia**: el I por el vi o el iii; el IV por el ii; el V por el vii°.

**C – F – G – C** → **Am – Dm – G – C**. Mismo recorrido de funciones, clima completamente distinto.

#### 2. Meter dominantes secundarias

Antes de cualquier grado, su propio V7.

**C – Am – Dm – G** → **C – E7 – Am – A7 – Dm – G**. Cada acorde llega ahora "anunciado".

#### 3. Sustitución tritonal

Cambiá un dominante por el que está un semitono arriba del destino, y el bajo baja cromático.

**Dm7 – G7 – C** → **Dm7 – D♭7 – C**.

#### 4. ii-V delante de todo

A cualquier acorde le podés poner su ii-V completo. Con eso, cuatro acordes se vuelven ocho y la armonía empieza a moverse el doble.

#### 5. La única regla que no se negocia

**La melodía tiene que seguir entrando.** Cada nota de la melodía, sobre el acorde nuevo, tiene que ser:

- una nota del acorde, o
- una tensión que suene bien (9, 11 sobre acordes menores, 13), o
- una nota de paso en tiempo débil.

Si la nota de la melodía queda como una ♭9 sobre un acorde mayor, no importa lo elegante que sea la sustitución: suena mal. **El oído manda.**

#### 6. Cómo se practica

Agarrá un tema simple que sepas de memoria —*Cumpleaños feliz* sirve— y armonizalo tres veces:

1. Con los tres acordes básicos (I, IV, V).
2. Sustituyendo por función.
3. Con dominantes secundarias y algún ii-V.

Es la misma melodía las tres veces. Escuchar cuánto cambia es entender de una vez qué hace la armonía.
    `,
  dictationScript: 'Última técnica del recorrido, y es la que junta todo lo demás. Reharmonizar es cambiarle los acordes a una melodía que ya existe, sin tocarle una nota. Tenés cuatro herramientas y ya las conocés todas: sustituir un acorde por otro de la misma función, meter dominantes secundarias, usar la sustitución tritonal, y armar un ii cinco delante de cualquier acorde. La única regla que no se negocia es que la melodía tiene que seguir entrando: cada nota de la melodía tiene que ser del acorde nuevo o una tensión que suene bien sobre él. Si eso se cumple, podés vestir la misma canción de mil maneras.',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Cuál es el límite de una reharmonización?',
          options: [
            'No usar más de cuatro acordes',
            'Que cada nota de la melodía siga entrando en el acorde nuevo',
            'No cambiar de tonalidad',
            'Usar sólo acordes de la tonalidad'
          ],
          correctIndex: 1,
          explanation: 'La melodía no se toca, así que es ella la que decide qué acordes son posibles: cada nota tiene que ser del acorde, una tensión que suene bien, o una nota de paso débil.'
        },
        {
          question: 'Querés reemplazar un acorde de Do mayor manteniendo su función de tónica. ¿Cuál usás?',
          options: ['Fa mayor', 'Sol mayor', 'La menor', 'Si disminuido'],
          correctIndex: 2,
          explanation: 'La menor comparte dos notas con Do (Do y Mi) y cumple la misma función de tónica. Fa y Re menor son subdominante; Sol y Si disminuido, dominante.'
        }
      ],
      practicalTask: {
        instruction: 'Tocá el acorde con el que reemplazarías un Do mayor sin cambiarle la función: La, Do, Mi.',
        requiredSequence: ['A4', 'C5', 'E5'],
        mode: 'chord',
        hint: 'El relativo menor: comparte dos de las tres notas con Do mayor.'
      }
    },
  },
  '15': {
  content: `
### La Libertad del Pianista: Improvisar 

Tocar piano no es solo reproducir lo que otros escribieron; es **expresar lo que tú sientes**.

#### 1. La Escala Pentatónica Mayor de Do
Contiene solo 5 notas:
**Do (C) - Re (D) - Mi (E) - Sol (G) - La (A)**
- Se eliminan el Fa y el Si (los semitonos que generan disonancias).
- ¡Es imposible tocar una nota "equivocada" con la pentatónica!

#### 2. Cómo Crear tus Primeros Solos
1. Con la mano izquierda, mantén un bajo firme en **C3** o **Am**.
2. Con la mano derecha, juega libremente con las 5 notas de la pentatónica.
3. Haz pausas: el silencio es la nota más expresiva de la música.
4. Repite pequeños motivos rítmicos.

---
** Evaluación Final de Certificación:**
Rinde la prueba final teórica y práctica para graduarte oficialmente del Conservatorio Virtual de PianoMaster.
    `,
  dictationScript: '¡Qué momento, che! Llegaste a la lección final de tu instructor virtual. Arrancamos de cero ubicando el Do Central y mirá todo lo que caminaste: inversiones, acordes de séptima y el círculo de quintas. Ahora el teclado es tuyo. La escala pentatónica mayor tiene cinco notas sagradas: Do, Re, Mi, Sol y La. Con esas cinco notas podés improvisar libremente sobre cualquier bajo sin errarle a ninguna nota. Tocá con el corazón, que la música ya vive en vos. ¡Un abrazo enorme y vamos arriba!',
      evaluation: {
      theoreticalQuestions: [
        {
          question: '¿Qué notas de la escala diatónica de Do Mayor se omiten para formar la escala Pentatónica Mayor?',
          options: [
            'Do y Sol',
            'Fa y Si (grados 4 y 7)',
            'Re y Mi',
            'No se omite ninguna'
          ],
          correctIndex: 1,
          explanation: 'Se eliminan el 4º y 7º grado (Fa y Si), eliminando los semitonos disonantes y permitiendo improvisación consonante pura.'
        },
        {
          question: '¿Cuál es el secreto supremo para ser un gran pianista de por vida?',
          options: [
            'Tocar únicamente cuando hay exámenes',
            'La práctica consciente diaria, escuchar con atención y disfrutar el sonido',
            'Presionar las teclas con la mayor fuerza física posible',
            'Memorizar sin entender la armonía'
          ],
          correctIndex: 1,
          explanation: 'La constancia, la audición atenta y la pasión por el sonido son los verdaderos pilares del maestro.'
        }
      ],
      practicalTask: {
        instruction: 'Ejecuta la escala Pentatónica Mayor completa: C4, D4, E4, G4, A4 y culmina en C5.',
        requiredSequence: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
        mode: 'sequence',
        hint: 'Do, Re, Mi, Sol, La, Do.'
      }
    },
  },
};
