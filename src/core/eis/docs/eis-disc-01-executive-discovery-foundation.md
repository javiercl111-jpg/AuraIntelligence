# EIS-DISC-01 — Executive Discovery Foundation

## Objetivo

Este sprint crea la primera foundation ejecutable del Executive Discovery Capability dentro de `src/core/eis`. La foundation recibe evidencia validada por contrato, normaliza y redacta patrones sensibles, delega el razonamiento a un puerto independiente de proveedor, verifica la trazabilidad del diagnóstico y devuelve un `CapabilityResult<ExecutiveDiagnosis>` serializable.

No pretende sustituir una consultoría ejecutiva ni inferir conclusiones empresariales que no estén sustentadas por evidencia explícita.

## Alcance implementado

- Contratos readonly de request, aserción mínima de consentimiento, evidencia, diagnóstico, madurez, riesgos, oportunidades, recomendaciones, acciones y confianza.
- Catálogos serializables con objetos `as const`; no se usan enums de TypeScript.
- Validación runtime estricta de requests y diagnósticos.
- Normalización sin mutación y orden estable de evidencia.
- Redacción determinista de patrones sensibles comunes.
- Puerto `ExecutiveDiscoveryReasoningProvider` independiente de proveedores comerciales.
- `ExecutiveDiscoveryCapability` pura, sin persistencia ni efectos secundarios de infraestructura.
- `DeterministicExecutiveDiscoveryReasoningProvider` mínimo y no generativo.
- Errores tipados, seguros y estables.
- Pruebas unitarias de contratos, validación, normalización, capability y serialización.

## Arquitectura

El límite futuro confirmado permanece:

```text
Executive Discovery
  -> Control Center Backend
  -> Executive Intelligence Adapter
  -> Aura Intelligence API
  -> Executive Discovery Capability
  -> Executive Diagnosis
  -> persistencia canónica en Control Center
```

Este sprint implementa únicamente los contratos y la capability pura situados dentro de Aura Intelligence. No implementa el backend, el adapter, la API ni la persistencia.

El flujo interno actual es:

```text
unknown boundary input
  -> strict request validation
  -> safe normalization
  -> evidence redaction
  -> provider port
  -> strict diagnosis validation
  -> request identity and evidence-reference checks
  -> CapabilityResult<ExecutiveDiagnosis>
```

## Contratos

### ExecutiveDiscoveryRequest

Transporta identificadores de request, correlación, idempotencia, organización, tenant, compañía y sesión; versiones de esquema, capability y definición; locale; timestamp ISO-8601; evidencia; aserción mínima de consentimiento; y metadata escalar restringida.

El esquema es estricto. Rechaza campos extra, por lo que el cliente no puede enviar madurez, diagnóstico, briefing, riesgos, oportunidades, recomendaciones u otras conclusiones precalculadas.

### ExecutiveDiscoveryEvidence

Acepta valores JSON, nunca binarios, archivos, funciones, `Date`, `Map`, `Set` ni clases. La clasificación distingue:

- `USER_CONFIRMED`: dato confirmado por la persona usuaria.
- `INFERRED`: dato inferido y no confirmado.
- `SYSTEM_OBSERVED`: observación del sistema.
- `MISSING`: ausencia explícita de información.

Cada evidencia incluye identidad, fuente, referencia, timestamp, alcance de consentimiento y confianza de 0 a 1.

### Consent assertion

La aserción solo confirma que Control Center verificó los consentimientos de privacidad y procesamiento diagnóstico. Aura Intelligence no se convierte en propietaria del recibo completo ni del ciclo de consentimiento.

### ExecutiveDiagnosis

El diagnóstico incluye snapshot del negocio separado por clasificación, madurez, riesgos, oportunidades, recomendaciones, acciones, confianza, warnings, evidencia referenciada y metadata de generación. Todos los timestamps públicos son strings ISO-8601.

Todo riesgo, oportunidad, recomendación y acción requiere por esquema al menos una referencia de evidencia. La validación contextual confirma que las referencias existen en el request y que organización, tenant, compañía, sesión, versión, request y correlación coinciden.

## Validación runtime

Se eligió **Zod 4.4.3** como única dependencia directa de validación. Encaja con los contratos TypeScript existentes, permite esquemas estrictos compuestos sin introducir un generador adicional y valida datos `unknown` en runtime antes de tratarlos como DTOs.

Los esquemas validan, entre otros aspectos:

- strings no vacíos;
- timestamps ISO-8601 con zona;
- versión de esquema soportada (`1.0`);
- consentimiento de privacidad y procesamiento diagnóstico afirmativos;
- al menos una evidencia y hasta 500 elementos;
- tipos y clasificaciones de evidencia;
- metadata escalar restringida y acotada;
- valores JSON;
- scores de madurez entre 0 y 100;
- scores de confianza y factibilidad entre 0 y 1;
- identificadores únicos;
- referencias de evidencia y acciones válidas.

Los errores públicos contienen códigos, categoría, retryability y detalles seguros acotados. No contienen valores completos de evidencia, stack traces, prompts, credenciales ni mensajes internos de un proveedor.

## Normalización

`normalizeExecutiveDiscoveryRequest`:

- crea un objeto nuevo y clona recursivamente valores JSON;
- aplica trim a strings de transporte, sin cambiar mayúsculas/minúsculas de IDs;
- normaliza locales como `ES_mx` a `es-MX`;
- ordena evidencia por `capturedAt`, luego `evidenceId`, conservando estabilidad;
- elimina objetos de metadata sin entradas;
- no recorta ni reinterpreta strings dentro de `value` o `normalizedValue`.

Esta última decisión evita alterar semánticamente una respuesta libre.

## Privacidad y redacción

`redactDiscoveryEvidence` recorre `value`, `normalizedValue`, `sourceReference` y metadata escalar. Reemplaza de forma determinista patrones comunes de:

- emails;
- teléfonos con separadores y números continuos de 10 a 15 dígitos;
- bearer tokens;
- parámetros sensibles comunes en URLs;
- claves API obvias y prefijos `sk_live`, `sk_test`, `pk_live` y `pk_test`.

La redacción es una defensa previa a futuros proveedores, no anonimización perfecta ni prevención completa de pérdida de datos. Puede producir falsos positivos o no reconocer formatos desconocidos, secretos fragmentados, datos codificados o PII expresada en lenguaje natural. El propietario del origen debe minimizar evidencia antes de enviarla.

## Capability y determinismo

`ExecutiveDiscoveryCapability` recibe por inyección:

- `ExecutiveDiscoveryClock`;
- `ExecutiveDiscoveryIdFactory`;
- `ExecutiveDiscoveryReasoningProvider`.

No usa directamente `Date.now`, `Math.random` ni `crypto.randomUUID`. Con el mismo request y las mismas dependencias inyectadas, el resultado es idéntico. La capability captura fallas del provider y de dependencias y nunca propaga errores no controlados al consumidor.

El resultado genérico EIS evolucionó a una unión discriminada `CapabilityResult<T>` con una sola forma `CapabilityError`, warnings, correlación y metadata de ejecución. El campo legado opcional `artifacts` permanece para evitar una ruptura innecesaria del contrato base. La búsqueda de consumidores confirmó que actualmente solo las pruebas EIS usan estos contratos.

## Reasoning provider determinista

`DeterministicExecutiveDiscoveryReasoningProvider` es una foundation de pruebas. Su comportamiento es deliberadamente limitado:

- separa hechos confirmados, inferidos, observados y faltantes;
- detecta valores contradictorios para una misma clave explícita;
- calcula confianza usando clasificación, confianza declarada, cobertura faltante y contradicciones;
- devuelve `INSUFFICIENT_EVIDENCE` cuando no existen al menos dos evidencias sustentadas o falta evidencia primaria confirmada/observada;
- nunca inventa dimensiones de madurez;
- devuelve listas vacías de riesgos, oportunidades, recomendaciones y acciones mientras no exista una regla de dominio explícita y sustentada.

`overallScore: 0` en la madurez determinista es un placeholder contractual acompañado por un rationale que declara que no se realizó una evaluación. No debe interpretarse como una calificación empresarial real.

## Compatibilidad EIS

Se agregaron, sin eliminar valores existentes:

- `ExecutiveCapabilityType.EXECUTIVE_DISCOVERY`;
- `ExecutiveArtifactType.EXECUTIVE_DIAGNOSIS`.

El EIS ya contenía un catálogo categórico llamado `ExecutiveConfidence`. El nuevo contrato estructurado requerido también se llama `ExecutiveConfidence` dentro de discovery. Para evitar romper el símbolo legado, el barrel raíz expone la foundation bajo el named namespace `ExecutiveDiscovery`; los consumidores pueden importar directamente desde `src/core/eis/discovery` o usar `EIS.ExecutiveDiscovery` para valores runtime.

El contrato legado `ExecutiveRecommendation` usa `Date` y una forma orientada a artefactos, por lo que no se reutilizó dentro del DTO de transporte. Discovery define una recomendación JSON-only con los campos y evidencia requeridos, sin modificar el contrato anterior.

## Responsabilidades

Control Center conserva propiedad sobre leads, prospectos, sesiones, consentimiento completo, evidencia cruda, CRM, persistencia canónica, reportes, PDFs y ciclo comercial.

Aura Intelligence conserva propiedad sobre interpretación, diagnóstico, riesgos, oportunidades, recomendaciones, acciones, confianza y trazabilidad intelectual. En este sprint esa responsabilidad existe solo como contratos, validación, orquestación pura y baseline determinista.

## Fuera de alcance y limitaciones explícitas

- No existe integración real con Gemini ni con otro proveedor generativo.
- No existe API.
- No existe persistencia.
- No existe conexión con Control Center.
- No existe adapter de transporte.
- No existen Firebase Functions ni infraestructura de despliegue.
- No existen prompts productivos ni credenciales.
- El reasoning provider determinista es una foundation de pruebas.
- El provider determinista no representa todavía una consultoría ejecutiva generativa completa.
- No se replicó el maturity score del frontend ni lógica de Growth Studio.

## Siguiente sprint recomendado

Implementar un **Executive Intelligence Adapter contract sprint** sin proveedor real: definir envelopes HTTP independientes del framework, autenticación entre servicios como interfaz, versionado y negociación de esquemas, idempotencia, timeouts/retries, límites de payload y pruebas contractuales Control Center–Aura Intelligence. Mantener la persistencia en Control Center y conectar un proveedor generativo solo en un sprint posterior con evaluación, observabilidad segura y controles de privacidad aprobados.
