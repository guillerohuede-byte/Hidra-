# Cómo estima Hidra la meta de hidratación (método v1)

> Hidra es una herramienta de hábitos. Esta estimación es **orientativa**: no es una
> recomendación médica ni un cálculo clínico. La persona siempre puede ajustarla.

## 1. Referencias

| Fuente | Qué tomamos |
|---|---|
| National Academies (IOM), *Dietary Reference Intakes for Water…* (2004/2005) | Ingesta adecuada de **agua total** (bebidas + alimentos) en adultos: 3,7 L/día hombres y 2,7 L/día mujeres. De eso, las **bebidas** aportan ≈ 3,0 L y 2,2 L; el ~20 % restante viene de los alimentos. Mismos valores para 19–30, 31–50, 51–70 y 70+. La mayoría de las personas sanas se hidrata bien guiándose por la sed; quienes son muy activos o viven en clima caluroso pueden necesitar más. Niños y adolescentes tienen valores propios. |
| EFSA, *Dietary Reference Values for water* (2010) | Ingesta adecuada de agua total: 2,0 L/día mujeres y 2,5 L/día hombres; algunas personas necesitan más y otras menos, y las personas más grandes tienden a necesitar más. |
| CDC, *About Water and Healthier Drinks* | No existe una recomendación de cuánta agua **pura** beber; las recomendaciones son de agua total y varían por edad, sexo, embarazo, lactancia y actividad. |
| ACSM, *Exercise and Fluid Replacement* (2007) y NATA (2017) | La sudoración varía mucho entre personas; se recomienda individualizar (pesarse antes y después del ejercicio) y **no beber más de lo que se pierde** por sudor. |

## 2. Qué calcula Hidra

Hidra estima solo **líquidos para beber** (agua y otras bebidas), no el agua total. Por eso
parte de los valores de *bebidas* de las National Academies (2,2–3,0 L) y no de los de agua total.

### Meta base (todos los días)
1. **Peso como guía:** `30 ml × kg`, acotado entre **1,6 L** y **3,0 L**.
   - Con 73 kg da ≈ 2,2 L, y con 100 kg o más, 3,0 L: el mismo rango de bebidas de las National Academies.
   - El piso de 1,6 L equivale a ~80 % de los 2,0 L de agua total de EFSA, es decir, la parte que aportan las bebidas.
   - No preguntamos sexo; el peso hace de aproximación. Es una heurística, no una fórmula clínica.
2. **Calor o sudoración en el día a día** (clima, trabajo físico, sin contar el entrenamiento):
   - nunca: +0
   - a veces: +250 ml
   - frecuente: +500 ml

   Son ajustes modestos y explícitos, en línea con que las fuentes reconocen necesidades mayores en climas calurosos.

### Ajuste de días de entrenamiento (solo esos días)
`horas de ejercicio × tasa según intensidad`, redondeado a 50 ml y con un máximo de 1,2 L.

| Intensidad | Tasa |
|---|---|
| suave | 0,3 L/h |
| moderada | 0,5 L/h |
| intensa | 0,7 L/h |

Las tasas son conservadoras frente a las sudoraciones típicas descritas por ACSM y NATA: buscan reponer parte de lo perdido sin incentivar beber de más.

**Sin duplicar ajustes:** el calor del día a día va en la meta base; el sudor del entrenamiento va **solo** en el ajuste del día de entrenamiento.

### Límites y redondeo
- Meta base máxima: **3,5 L**. Meta de un día de entrenamiento: máximo **4,0 L**.
- Redondeo a 100 ml en la base y a 50 ml en el ajuste.

## 3. Cuándo NO se aplica el cálculo (meta manual)
- **Menores de 18 años:** las National Academies tienen valores distintos por edad y sexo para niños y adolescentes, y no aplicamos una fórmula pensada para adultos.
- La persona indica que **un profesional de salud le dio una indicación sobre cuánto líquido tomar** (por ejemplo, restringirlo o aumentarlo).
  - Hidra no pregunta ni guarda diagnósticos: solo ofrece la meta manual.

## 4. Avisos de revisión individualizada
Se muestra un aviso, sin bloquear nada, cuando:
- la estimación toca un límite máximo;
- el entrenamiento dura más de 90 minutos;
- el peso está fuera del rango 40–150 kg.

En esos casos se sugiere medir la sudoración (pesarse antes y después) o consultar a un profesional.

## 5. Qué NO hace
- No reemplaza la sed como guía.
- No da premios por superar la meta: los premios ya tienen tope diario.
- Cambiar la meta **nunca** modifica días anteriores: cada día guarda la meta que tenía.
- No guarda información médica. Solo guarda rango de edad, peso, ejercicio habitual y exposición al calor, que se pueden borrar desde Perfil → Hidratación.
