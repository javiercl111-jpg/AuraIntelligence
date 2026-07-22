# EIS-DISC-03 — Service Identity & Tenant Authorization

## Objetivo

Este sprint incorpora una frontera de identidad de servicio entre el futuro backend de Aura Control Center y `evaluateExecutiveDiscoveryV1`. La función requiere una identidad de servicio verificada y aplica autorización exacta por tenant, organización y compañía antes de invocar `ExecutiveDiscoveryCapability`.

El `tenantId` del body identifica el recurso solicitado, pero nunca concede acceso. Los grants proceden exclusivamente de configuración server-side asociada al `subject` verificado.

## Arquitectura

El flujo implementado es:

1. El handler conserva las validaciones de método y `Content-Type`.
2. `extractBearerToken` exige un único valor con esquema Bearer.
3. un `ServiceIdentityVerifier` autentica el token y devuelve un `ServiceIdentity` tipado;
4. `ServiceAuthorizationPolicy` compara por igualdad exacta la identidad, el entorno, la versión de claims y los identificadores solicitados;
5. únicamente una decisión `allowed: true` permite invocar `ExecutiveDiscoveryCapability`;
6. el handler mantiene los envelopes HTTP existentes y registra solo metadata sanitizada.

La lógica criptográfica no reside en el handler. La composición de Firebase selecciona el verifier y sus dependencias al iniciar el módulo.

## Autenticación y autorización

Autenticación responde “qué servicio llama”. Verifica firma, issuer, audience, subject y vigencia del token. Sus fallos públicos producen un 401 genérico, salvo un caller firmado pero fuera de la allowlist, que produce 403.

Autorización responde “a qué recursos puede acceder ese servicio”. Compara el `subject`, entorno, `claimsVersion`, tenant, organización y compañía con grants server-side. Sus fallos producen un 403 genérico. Los códigos internos se conservan para pruebas y logging seguro, pero no se incluyen en la respuesta pública.

## ServiceIdentity

`ServiceIdentity` es un contrato interno y serializable que contiene:

- `subject`, `issuer` y la lista `audience`;
- `authenticationMethod`: `OIDC`, `DEVELOPMENT` o `TEST` mediante catálogo `as const`, no `enum`;
- `environment`;
- `authorizedTenantIds`, `authorizedOrganizationIds` y, cuando se configura, `authorizedCompanyIds`;
- `issuedAt`, `expiresAt` y `tokenId` opcionales;
- `claimsVersion`.

No contiene token, credenciales, Authorization header, nombre de persona ni correo personal.

## OIDC, issuer, audience y subject

Se eligió `jose` 6.2.3 como única dependencia JWT/OIDC. La razón es que ofrece verificación conjunta de firma y claims JWT, funciona con JWKS remoto y permite inyectar un key resolver para pruebas locales. El diseño no está acoplado a un proveedor cloud específico.

`JoseOidcTokenVerifier` ejecuta `jwtVerify` con:

- algoritmos configurados explícitamente;
- JWKS obtenido exclusivamente desde una URI HTTPS server-side confiable;
- allowlists exactas de issuer y audience;
- fecha actual inyectada;
- tolerancia de reloj configurada.

`OidcServiceIdentityVerifier` vuelve a validar de forma defensiva los claims verificados, exige `sub`, `exp`, `iat`, `environment` y `claims_version`, controla `exp`, `iat` futuro y edad máxima, y deriva los grants desde la configuración del subject. Nunca acepta un JWT meramente decodificado ni toma grants desde claims no verificados.

Los tests criptográficos usan un par de claves RS256 efímero local y no llaman endpoints externos.

## Grants y policy

Las relaciones subject → tenant, subject → organización y subject → compañía se cargan desde configuración server-side. Las comparaciones usan `includes` con igualdad completa; no existen prefijos, substrings ni coincidencias parciales. Una manipulación como `tenant-001-admin` no coincide con `tenant-001`.

Los códigos de autorización son:

- `TENANT_NOT_AUTHORIZED`;
- `ORGANIZATION_NOT_AUTHORIZED`;
- `COMPANY_NOT_AUTHORIZED`;
- `ENVIRONMENT_NOT_AUTHORIZED`;
- `CLAIMS_VERSION_UNSUPPORTED`;
- `SUBJECT_NOT_AUTHORIZED`.

## Configuración server-side

`loadExecutiveDiscoverySecurityConfig` carga y valida al iniciar las siguientes variables, ninguna con prefijo `VITE_`:

- `EIS_SECURITY_ENVIRONMENT`;
- `EIS_SECURITY_ALLOWED_ISSUERS`;
- `EIS_SECURITY_ALLOWED_AUDIENCES`;
- `EIS_SECURITY_ALLOWED_SUBJECTS`;
- `EIS_SECURITY_SUBJECT_TENANT_GRANTS`;
- `EIS_SECURITY_SUBJECT_ORGANIZATION_GRANTS`;
- `EIS_SECURITY_SUBJECT_COMPANY_GRANTS` (opcional; sin ella no se autoriza una solicitud que incluya compañía);
- `EIS_SECURITY_ALLOW_DEVELOPMENT_VERIFIER`;
- `EIS_SECURITY_CLOCK_SKEW_SECONDS`;
- `EIS_SECURITY_TOKEN_MAX_AGE_SECONDS`;
- `EIS_SECURITY_CLAIMS_VERSION`;
- `EIS_SECURITY_AUTHORIZATION_HEADER_REQUIRED`;
- `EIS_SECURITY_OIDC_JWKS_URI`;
- `EIS_SECURITY_OIDC_ALGORITHMS`;
- `EIS_SECURITY_DEVELOPMENT_IDENTITIES`, solo para development/test.

Listas simples son valores separados por comas. Grants son objetos JSON cuyas claves deben coincidir con subjects permitidos. Las identidades de desarrollo son una lista JSON de pares `token`/`subject`; el token debe proceder de configuración local controlada y nunca del código.

La configuración falla de forma explícita si faltan valores, existen duplicados, grants y subjects no concuerdan, la URI JWKS no es HTTPS, faltan algoritmos OIDC, se intenta hacer opcional Authorization o se habilita el verifier de desarrollo en producción. El error solo expone un código seguro y no refleja valores de configuración.

## DevelopmentServiceIdentityVerifier

`DevelopmentServiceIdentityVerifier` permite pruebas y desarrollo local con una allowlist explícita. Solo opera cuando tanto su configuración como el contexto son `development` o `test`, exige una credencial configurada y valida el subject contra la allowlist. No acepta callers automáticamente y no contiene API keys hardcodeadas.

**NO VÁLIDO PARA PRODUCCIÓN.** La configuración rechaza su activación en `production` y el propio verifier también falla cerrado en ese entorno.

## Integración con el handler

`createEvaluateExecutiveDiscoveryV1Handler` recibe capability, verifier, policy, configuración, logger y reloj mediante inyección. Para un POST JSON:

1. extrae Authorization sin registrarlo;
2. verifica identidad;
3. parsea JSON;
4. obtiene únicamente los identificadores técnicos necesarios para la decisión;
5. autoriza tenant, organización y compañía;
6. solo entonces entrega el request al capability para su validación y ejecución.

Si autenticación o autorización falla, el capability no se invoca. El handler tampoco contiene verificación de firma ni resolución JWKS.

## Respuestas 401 y 403

401 usa el envelope existente con `AUTHENTICATION_REQUIRED` y mensaje genérico para Authorization ausente, esquema incorrecto, token vacío o ambiguo, JWT inválido, firma inválida, issuer/audience inválidos, expiración y errores internos seguros de identidad.

403 usa `ACCESS_FORBIDDEN` y mensaje genérico para caller fuera de allowlist o fallos de policy por subject, entorno, versión de claims, tenant, organización o compañía.

La respuesta no contiene token, código interno detallado, datos criptográficos, stack ni valores de configuración.

## Logging y privacidad

El logger de seguridad aplica una allowlist de campos y sanitiza antes de escribir. Puede registrar correlation/request ID ya validados, subject técnico, issuer, audiences, environment, tenant, organización, compañía, outcome, código interno seguro y duración.

No recibe ni registra Authorization, token, body, evidencia, receipt de consentimiento, email, teléfono o stack. Valores con patrones de Bearer, email, teléfono o caracteres de control se omiten. Los campos desconocidos no sobreviven a la sanitización.

## Pruebas

La suite de Functions cubre:

- extracción Bearer, espacios, esquema, valores vacíos y ambiguos;
- firma RS256 local válida y manipulada;
- issuer, audience, subject, expiración, `iat`, edad máxima y caller allowlist;
- habilitación de development/test y fallo en producción;
- autorización exacta de tenant, organización y compañía;
- versión de claims, entorno y subject;
- carga segura de configuración;
- 401, 403, short-circuit del capability y envelopes;
- exclusión de token, header, PII, evidencia, receipt y detalles internos de logs/respuestas;
- las cinco regresiones del handler creadas en EIS-DISC-02.

Todos los relojes del dominio de seguridad son inyectables. Los tests no dependen del reloj real ni de infraestructura externa.

## Limitaciones actuales

- No se ha configurado IAM real.
- No existe service account productiva.
- No existe Workload Identity Federation.
- No se ha desplegado.
- Development verifier no es válido en producción.
- No existe conexión con Control Center.
- No hay proveedor generativo.
- No se han aprovisionado issuer, audience, JWKS ni grants productivos.
- No existe persistencia, rate limiting distribuido ni circuit breaker.

La implementación contiene la verificación criptográfica real y el adapter JWKS, pero su uso productivo requiere provisionar una autoridad OIDC confiable y suministrar configuración server-side real fuera del repositorio.

## Pasos para producción

1. Elegir y documentar la autoridad OIDC/IAM y crear la identidad de servicio de Control Center.
2. Restringir audience a este API y definir issuer, subject y algoritmos permitidos.
3. Publicar y operar un JWKS HTTPS confiable con rotación de claves.
4. Provisionar grants mínimos por tenant, organización y compañía mediante configuración protegida.
5. Deshabilitar el development verifier y validar el fail-fast de arranque.
6. Añadir pruebas de integración contra un entorno IAM no productivo.
7. Revisar retención/acceso de logs, alertas y respuesta a rotación o compromiso.
8. Configurar IAM de invocación y desplegar mediante el pipeline aprobado.

## Siguiente sprint

El siguiente sprint debe conectar un backend de Control Center no productivo a esta frontera mediante una identidad OIDC real, configurar IAM y rotación JWKS, y validar el flujo extremo a extremo. Controles operativos como rate limiting, idempotencia distribuida y circuit breaker deben mantenerse como trabajos separados.
