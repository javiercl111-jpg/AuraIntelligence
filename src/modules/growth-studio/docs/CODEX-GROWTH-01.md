# CODEX-GROWTH-01 — Discovery y alcance

Base inspeccionada: main, e6512e90884a67b5c0d8be782a3d7d4785c8905a.
Rama: codex/growth-advisor-business-profile-onboarding.

## Discovery antes de implementar

PERSISTENCE_AUTHORITY=NOT_FOUND

Se revisaron los servicios y tipos del repositorio, no datos ni configuración de producción.

| Candidato existente | Evidencia | Decisión |
| --- | --- | --- |
| services/growthIdentityRepository.ts | Lee growth_identities por UID: companyId, status, email, displayName. Sin escritura ni campos comerciales. | Reusar la identidad del runtime; no convertirla en memoria empresarial. |
| services/brandBrainMockService.ts | Map en memoria; clave bb_conversationId. | No es autoridad entre conversaciones. Mantener su contrato de estrategia actual. |
| config/growthStudioCollections.ts | Nombres de colecciones únicamente, sin implementación de persistencia. | No confundir constantes con almacenamiento real. |
| src/services/auraHCMConnectorService.ts | Lee companies/profiles para nombre, permisos, módulos y capacidades de HCM. | No existe contrato comercial ni escritura autorizada de perfil/catálogo Growth. |
| src/services/auraKnowledgeAdminService.ts | CRUD de artículos ai_knowledge_articles y gobernanza documental. | No ofrece identidad/versionado de BusinessProfile o ProductCatalog; adaptar artículos crearía una autoridad nueva implícita. |
| types/growthCommercialContext.ts, ProductContextBuilder, GrowthContextBootstrap | Contratos y transformaciones en memoria para empresa/productos. | REUSE: reutilizar CommercialKnowledgeField y la identidad/estado/fechas de ProductContext; extender con freshness opcional. |
| Servicios de conversaciones Production/Mock | Maps por conversación. | Mantener borradores de conocimiento separados del contexto de campaña en esta misma vida de sesión. |
| functions/src/talent | Registro de tenants y recibos de operaciones Talent. | Autoridades de otro dominio, sin perfil/catálogo comercial. |

No hay colección nueva, localStorage empresarial, caché por empresa, sincronización entre sesiones ni escritura remota.

## Implementación acotada

- BusinessProfile y ProductProfile son contratos de conocimiento reutilizable suministrado explícitamente por el caller, no repositorios.
- StartConversationParams y GrowthRuntimeProvider aceptan un perfil opcional y copian sus datos para evitar modificar la fuente del caller.
- Sin perfil: persona, función, empresa, actividad, nombres de productos y clientes/mercados; se pregunta sólo lo ausente.
- Se reutiliza el nombre del runtime cuando existe; el rol técnico de autorización no se confunde con la función empresarial.
- Tenant/company deben coincidir en perfil y productos; datos de otra persona no se reutilizan.
- Con perfil/catálogo conocido: selección de producto existente, alta explícita, actualización de descripción o crecimiento general.
- Las altas requieren autorización; las actualizaciones sustanciales pasan por candidato y confirmación explícita. No se acepta un «quizás sí» como autorización.
- Se pide descripción sólo para el producto seleccionado cuando falta o requiere confirmación. Los campos opcionales no bloquean el flujo.
- Actualizar un producto durante el intake o la reflexión regresa a la pregunta de campaña pendiente sin cambiar la audiencia, región, producto seleccionado ni objetivo.
- Freshness admite KNOWN/MISSING/STALE sin inventar caducidades. Una actualización explícita de descripción conserva ID, createdAt y campos opcionales.
- selectedProductId/growthScope se separan de audiencia, región, objetivo, canales y CTA. productOrService conserva la etiqueta requerida por los builders actuales.
- Production y Mock usan el mismo onboarding. El hook respeta el primer turno del servicio y protege envíos simultáneos con un lock síncrono.
- Se conserva el bridge autenticado, su payload y la exigencia de conversationProposal.nextQuestion. La pregunta visible sigue gobernada por la máquina local; no se refactorizó el bridge.
- La respuesta del bridge se valida antes de aceptar conocimiento o avanzar etapas: un error no confirma candidatos.
- Continúan reflexión, propuesta, CampaignStrategy y consumo desde Campaigns.

## Límite explícito y siguiente componente mínimo

El perfil/catálogo se pierde al iniciar otra conversación sin datos suministrados y al recargar. El primer turno informa esta limitación. Las pruebas que inyectan perfiles conocidos son fixtures explícitos, no pruebas de persistencia. El getter de perfil devuelve una copia; no guarda ni carga automáticamente otra conversación.

Falta definir y autorizar un repositorio de conocimiento comercial con lectura por tenant/company, contexto personal por UID, escritura de candidatos confirmados, aislamiento de acceso y control de versión. El runtime podrá cargar ese contrato antes de startConversation y guardar cambios confirmados. No se implementa ese repositorio porque no existe una autoridad apropiada y el encargo prohíbe inventarla.

La entrega es PARTIAL respecto al objetivo de memoria permanente. Business Profile y Product Catalog funcionan como borradores de sesión y entradas reutilizables explícitas; CROSS_CONVERSATION_PERSISTENCE=False.

## Validación

Los tests dirigidos cubren los diez golden cases del encargo: primer uso; empresa/catálogo conocidos; selección; altas; conocimiento existente; audiencia de campaña independiente; secuencia Growth; CampaignStrategy en Campaigns; ausencia de falsa persistencia. También cubren consentimiento negativo/ambiguo, STALE, identidad/tenant, actualización durante campaña, fallo de bridge y envío doble.

- Tests dirigidos: PASS, 57 pruebas en 6 archivos.
- Typecheck: PASS, node node_modules/typescript/bin/tsc -b --pretty false.
- Build: PASS, npm run build; aviso de bundle mayor de 500 kB.
- ESLint de los archivos fuente modificados: único error en GrowthRuntimeProvider, react-refresh/only-export-components. Se reprodujo también sobre el archivo original de main; no se abrió una refactorización para corregirlo.

No se instalaron paquetes: se copiaron dependencias ya existentes de un checkout local. No se modificaron main, infraestructura, configuración, variables de producción ni servicios externos.
