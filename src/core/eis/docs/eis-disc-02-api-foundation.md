# EIS-DISC-02 — Executive Discovery API Foundation

## Arquitectura

`evaluateExecutiveDiscoveryV1` es una Firebase Function HTTP v2 escrita en TypeScript y ejecutable sobre Node.js 22. La función constituye únicamente la superficie de transporte: comprueba el método y el tipo de contenido, obtiene el JSON, delega al `ExecutiveDiscoveryCapability` del EIS y traduce su resultado a un envelope HTTP.

El razonamiento, la normalización y la validación de los contratos permanecen en `src/core/eis/discovery`. La capa `functions` solo compone las dependencias técnicas del capability: reloj, fábrica determinista de identificadores y el proveedor determinista ya contenido en el EIS. No contiene reglas ejecutivas ni reproduce los esquemas del dominio.

## Endpoint

- Export: `evaluateExecutiveDiscoveryV1`
- Plataforma: Firebase Functions v2
- Método aceptado: `POST`
- `Content-Type`: `application/json` (se admite el parámetro `charset`)
- Request: `ExecutiveDiscoveryRequest` versión de esquema `1.0`
- Respuesta exitosa: HTTP `200`, con `ExecutiveDiagnosis` en `data`

Envelope exitoso:

```json
{
  "success": true,
  "data": { "diagnosisId": "diagnosis-..." },
  "meta": {
    "correlationId": "correlation-001",
    "warnings": []
  }
}
```

Envelope de error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DISCOVERY_REQUEST",
    "message": "The Executive Discovery request is invalid."
  },
  "correlationId": "correlation-001"
}
```

## Flujo

1. Rechazar cualquier método distinto de `POST` con `400` y publicar `Allow: POST`.
2. Requerir `Content-Type: application/json`; una ausencia o valor distinto produce `400`.
3. Leer el cuerpo JSON; un documento malformado produce un envelope `400`.
4. Entregar el valor sin reinterpretarlo a `ExecutiveDiscoveryCapability.execute`.
5. Dejar que el EIS valide y procese `ExecutiveDiscoveryRequest`.
6. Traducir una solicitud de dominio inválida a `422`, una ejecución válida a `200` y un fallo interno, de proveedor o de diagnóstico a un envelope seguro `500`.

Los estados `401` y `403`, junto con los códigos `AUTHENTICATION_REQUIRED` y `ACCESS_FORBIDDEN`, quedan reservados como placeholders del contrato de transporte. Esta versión no los emite porque no implementa autenticación ni autorización.

## Limitaciones

- La función no implementa IAM, OIDC, App Check, secretos ni políticas de acceso.
- No existe rate limiting, idempotencia distribuida ni circuit breaker.
- No existe persistencia, Firestore ni almacenamiento de resultados.
- No existe telemetría avanzada.
- El proveedor conectado es el proveedor determinista existente del EIS; no se integra ningún proveedor externo real.
- No se configura CORS ni se ofrece un adaptador para Control Center.

## Fuera de alcance

Growth Studio, React, componentes, páginas, `App.tsx`, Control Center, Executive Workspace, Gemini, Claude, OpenAI, prompts reales, Secret Manager, despliegue y cambios de infraestructura quedan fuera de este sprint.

## Siguiente Sprint

Incorporar una capa de seguridad real y verificable delante del handler, con decisiones explícitas sobre IAM/OIDC y autorización tenant-aware. Después podrán definirse controles operativos básicos —límites de consumo, observabilidad y estrategia de despliegue— sin mover lógica de razonamiento fuera del EIS.
