# Walkthrough: Growth-07 — Executive Content Brief™

## Objetivo Funcional
Implementar el Executive Artifact™ que actúa como el contrato oficial y estructurado entre Aura Intelligence y cualquier motor de IA generativa. Este componente consolida la información estratégica y directrices de marca para garantizar que la generación de contenido sea completamente alineada a la gobernanza corporativa, sin redactar prompts directos.

## Estructura de Artefactos

### Artefactos Consumidos
* **ContentPlan**: Provee la lista de activos planificados, dependencias (DAG), y el activo recomendado actual (`nextRecommendedAsset`).
* **ExecutiveExecutionPlan**: Define las metas de ejecución generales y las restricciones financieras/temporales.
* **CampaignStrategy**: Proporciona el objetivo de la campaña, la audiencia primaria, canales sugeridos y el mensaje central (`coreMessage`).
* **BrandBrain**: Aporta los lineamientos de comunicación, tono de voz y estilo.

### Artefacto Producido
* **ExecutiveContentBrief**: Documento estructurado e inmutable de especificaciones para generación.

### Artefacto Enriquecido
* **ExecutiveProposal**: Se incorpora el estado y la disponibilidad del Brief para enriquecer la propuesta ejecutiva visible al usuario.

### Decisión Habilitada
Determinar si un activo sugerido en el plan de contenidos cuenta con la madurez ejecutiva suficiente para ser enviado a producción (IA Generativa), controlando el ciclo a través de la interfaz ejecutiva.

---

## Cambios en el Repositorio

* **14 archivos creados**:
  * `src/modules/growth-studio/types/executiveContentBrief.ts` (Modelos y tipos)
  * `src/modules/growth-studio/services/contracts/IExecutiveContentBriefService.ts` (Contrato de servicio)
  * `src/modules/growth-studio/services/executiveContentBriefMockService.ts` (Servicio Mock)
  * `src/modules/growth-studio/services/ExecutiveContentBriefBuilder.ts` (Ensamblador determinista)
  * `src/modules/growth-studio/services/ExecutiveContentBriefValidator.ts` (Validador de madurez)
  * `src/modules/growth-studio/components/BriefReadinessIndicator.tsx` (Componente de UI para porcentaje de preparación)
  * `src/modules/growth-studio/components/ConstraintCard.tsx` (Componente de restricciones)
  * `src/modules/growth-studio/components/EvidenceSummary.tsx` (Componente de origen/evidencias)
  * `src/modules/growth-studio/components/SuccessCriteriaCard.tsx` (Componente de criterios de éxito)
  * `src/modules/growth-studio/components/NextGenerationActionCard.tsx` (Componente de transición y acción siguiente)
  * `src/modules/growth-studio/components/ExecutiveContentBriefCard.tsx` (Visualizador de campos del brief)
  * `src/modules/growth-studio/components/ExecutiveContentBriefSummary.tsx` (Contenedor principal del Brief)
  * `src/modules/growth-studio/__tests__/ExecutiveContentBriefBuilder.test.ts` (Tests del Builder)
  * `src/modules/growth-studio/__tests__/ExecutiveContentBriefValidator.test.ts` (Tests del Validator)

* **7 archivos modificados**:
  * `src/modules/growth-studio/types/index.ts` (Barrel de tipos)
  * `src/modules/growth-studio/index.ts` (Barrel del módulo)
  * `src/modules/growth-studio/hooks/useGrowthConversation.ts` (Integración de estado y actualización del Brief)
  * `src/modules/growth-studio/components/ExecutiveConversationPage.tsx` (Renderizado de la sección del Brief)
  * `src/modules/growth-studio/components/ExecutiveProposalCard.tsx` (Visualización de estado del Brief y botón de acción)
  * `src/modules/growth-studio/services/ContentPlanBuilder.ts` (Corrección de variables declaradas pero no usadas)
  * `src/modules/growth-studio/__tests__/ContentPlanBuilder.test.ts` (Alineación de tipos mock para compatibilidad de compilación de pruebas)

### Justificación de Modificación en ContentPlanBuilder y sus Tests
Las modificaciones a `ContentPlanBuilder.ts` y su archivo de pruebas se realizaron **exclusivamente por motivos de compatibilidad de tipos y limpieza de linting** (variables no utilizadas en firmas de métodos y propiedades obsoletas en los mocks de prueba).
Confirmamos categóricamente que **no se alteraron**:
* La fórmula de cálculo de `ContentReadiness`.
* La estructuración del Grafo Dirigido Acíclico (DAG).
* La prioridad de selección de `nextRecommendedAsset`.
* Las reglas de no-alucinación heredadas de Growth-06.

---

## Lógica y Reglas de Negocio

### Fórmula de BriefReadiness (Puntaje Máximo: 100)
El cálculo es ponderado según el impacto ejecutivo de cada sección del Brief:
* `coreMessage`: 20 puntos
* `targetAudience`: 15 puntos
* `businessContext`: 15 puntos
* `brandGuidelinesAndTone`: 15 puntos
* `constraints`: 15 puntos
* `successCriteria`: 10 puntos
* `supportingEvidence`: 10 puntos

### Multiplicadores de Campo
Para evaluar la calidad de la información recopilada:
* `confirmed` / `ready` = **1.0**
* `inferred` / `partial` = **0.4**
* `missing` / `blocked` = **0.0**

El puntaje final se calcula como: `Math.round(SUMA(PuntosMaximos * Multiplicador))` acotado entre `0` y `100`.

### Estados del Brief
* **`draft`**: Estado inicial. No ha sido aprobado y puede tener información incompleta.
* **`review_required`**: El Brief está completo pero requiere revisión (o hubo un cambio en los artefactos origen que invalidó una aprobación previa).
* **`approved`**: El Brief ha sido verificado y aprobado explícitamente por el usuario para su posterior envío.

### Reglas de Bloqueo (`isBlocked` y `blockingReasons`)
Un Brief se bloquea completamente (`isBlocked = true`, `score = 0`) únicamente si:
* No existe un activo seleccionado (`selectedAsset` es nulo).
* El propósito del activo (`assetPurpose`) está ausente o vacío.
* El activo seleccionado no existe dentro del `ContentPlan` actual.
* No existe ninguna evidencia de origen que respalde el Brief.

En cualquier otro escenario incompleto, se reduce el score de madurez (`briefReadiness`), pero **no** se activa el flag `isBlocked` a menos que exista una invalidez estructural como las mencionadas.

### Transición de Acciones Ejecutivas
Las transiciones del Brief fluyen determinísticamente en la propiedad `nextGenerationAction`:
1. **`review_brief`**: Si el Brief está incompleto o su score de madurez es bajo.
2. **`approve_brief`**: Si el Brief tiene madurez y no tiene bloqueos, pero no está aprobado aún.
3. **`generate_asset`**: Si el Brief está en estado `approved` (Listo para generar el contenido).

**Nota**: No existe aprobación automática bajo ningún concepto. Toda aprobación requiere la confirmación explícita del usuario en la UI. Un cambio en los artefactos de origen que altere los datos del Brief causa que el estado regrese a `review_required` de inmediato.

---

## Decisiones de Arquitectura y Persistencia
* **Persistencia en Memoria**: La información se almacena únicamente en el estado local de la sesión de React y los Mock Services en memoria.
* **Sin Dependencias Externas**: Exclusión absoluta de Firebase, Firestore, localStorage, AI Gateway, llamadas a LLMs o generación dinámica de prompts de texto.

---

## Verificación de Calidad

### Pruebas Unitarias (`npm run test`)
* **Test Files**: 18
* **Tests Totales**: 101
* **Resultados**: 101 PASS, 0 FAIL
* **Duración promedio**: ~8 segundos

### Build y Lint (`npm run build` y `npm run lint`)
* **Compilación**: EXITOSA (`tsc -b && vite build` completo sin advertencias ni errores).
* **Linter**: 28 problemas preexistentes mantenidos fuera del alcance; **0 incidencias introducidas** en la carpeta `growth-studio`.
* **Git check**: `git diff --check` limpio (0 trailing whitespaces detectados).

---

## Análisis de Riesgos
1. **Pérdida de Estado**: Al no poseer persistencia física o en localStorage, refrescar la página reiniciará el flujo conversacional. Esto es aceptable en esta fase del prototipo en memoria.
2. **Desajuste de Tipos con Capas Superiores**: Dado que no modificamos el backend real, las llamadas e interfaces del Mock Service deben mantenerse aisladas del router real de Aura.

## Recomendación Final y Garantías
**GO** — Todos los entregables técnicos y de gobernanza se han completado y validado en local. El sistema es apto para integrarse al repositorio principal.

El Builder garantiza idempotencia semántica para el contenido empresarial cuando recibe los mismos artefactos de origen y selectedAssetId. Los metadatos temporales pueden variar sin alterar el resultado estratégico.
