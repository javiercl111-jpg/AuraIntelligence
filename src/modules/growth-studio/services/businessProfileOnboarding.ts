import type { BusinessKnowledgeField, BusinessProfile, ProductProfile } from '../types/businessProfile';
import type { GrowthConversation, GrowthConversationStage } from '../types/growthConversation';
import type { StartConversationParams } from './contracts/IGrowthConversationService';

type ProfileField = 'name' | 'role' | 'companyName' | 'businessDescription' | 'customersOrMarkets';
type CandidateUpdate =
  | { kind: 'catalog'; names: string[] }
  | { kind: 'field'; field: ProfileField; value: string }
  | { kind: 'product'; product: ProductProfile; isNew: boolean; authorized?: boolean };

export interface BusinessOnboardingSession {
  profile: BusinessProfile;
  pending?: CandidateUpdate;
  describingProductId?: string;
  resumeQuestion?: Question;
}

interface Question {
  stage: GrowthConversationStage;
  content: string;
}

export const SESSION_KNOWLEDGE_NOTICE =
  'Usaré el contexto disponible. Los cambios realizados aquí sólo se aplican a esta sesión; no se guardan para futuras conversaciones.';

export const knownBusinessField = <T>(value: T): BusinessKnowledgeField<T> => ({
  value, status: 'confirmed', confidence: 100, evidenceIds: [], freshness: 'KNOWN',
});

export const isKnownBusinessField = (field?: BusinessKnowledgeField<string>): boolean =>
  field?.status === 'confirmed' && Boolean(field.value?.trim()) &&
  field.freshness !== 'MISSING' && field.freshness !== 'STALE';

// These contracts contain JSON data only. Copies isolate caller-owned knowledge from session edits.
export const copyBusinessProfile = (profile: BusinessProfile): BusinessProfile =>
  JSON.parse(JSON.stringify(profile)) as BusinessProfile;

export function createBusinessSession(params: StartConversationParams): BusinessOnboardingSession {
  const supplied = params.businessProfile;
  if (supplied && (
    supplied.companyId !== params.companyId ||
    supplied.products.some(product =>
      product.companyId !== params.companyId)
  )) throw new Error('BUSINESS_PROFILE_SCOPE_MISMATCH');

  const profile = supplied ? copyBusinessProfile(supplied) : {
    id: `business:${params.tenantId}:${params.companyId}`,
    tenantId: params.tenantId,
    companyId: params.companyId,
    person: { userId: params.userId },
    products: [],
  };
  if (profile.person.userId !== params.userId) profile.person = { userId: params.userId };
  if (!profile.person.name?.value && params.userName?.trim()) {
    profile.person.name = knownBusinessField(params.userName.trim());
  }
  return { profile };
}

const normalize = (value: string): string =>
  value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const yes = (value: string): boolean =>
  /^(si|si,? (es correcto|confirmo|autorizo)|confirmo|correcto|autorizar|acepto)[.!]?$/.test(normalize(value));
const no = (value: string): boolean =>
  /^(no|cancelar|cancela|no,? gracias)[.!]?$/.test(normalize(value));
const companyScope = (value: string): boolean =>
  /^(crecimiento general( de (la )?empresa)?|empresa|toda la empresa)$/i.test(normalize(value));
const question = (stage: GrowthConversationStage, content: string): Question => ({ stage, content });

const fields: ProfileField[] = [
  'name', 'role', 'companyName', 'businessDescription', 'customersOrMarkets',
];
const fieldQuestions: Record<ProfileField, string> = {
  name: '¿Cuál es tu nombre?',
  role: '¿Qué función desempeñas en tu empresa?',
  companyName: '¿Cómo se llama tu empresa?',
  businessDescription: '¿A qué se dedica tu empresa?',
  customersOrMarkets: '¿Cuáles son los clientes o mercados principales de tu empresa?',
};
const getField = (profile: BusinessProfile, key: ProfileField) =>
  key === 'name' || key === 'role' ? profile.person[key] : profile[key];
const setField = (profile: BusinessProfile, key: ProfileField, value: string) => {
  if (key === 'name' || key === 'role') profile.person[key] = knownBusinessField(value);
  else profile[key] = knownBusinessField(value);
};
const needsCatalog = (profile: BusinessProfile) =>
  !profile.catalogReviewed && !profile.products.some(product =>
    product.status !== 'archived' && isKnownBusinessField(product.name));

export function nextBusinessQuestion(session: BusinessOnboardingSession): Question {
  const { profile } = session;
  for (const field of fields) {
    // Collect offerings before general customers, but never repeat a known catalog.
    if (field === 'customersOrMarkets' && needsCatalog(profile)) {
      return question('understanding_catalog',
        '¿Qué productos o servicios ofrece tu empresa? Indica sus nombres separados por comas, o escribe «crecimiento general».');
    }
    const current = getField(profile, field);
    if (!isKnownBusinessField(current)) {
      return question('understanding_business_profile', current?.value?.trim()
        ? `${fieldQuestions[field]} Tengo «${current.value}» pendiente de confirmar. Responde «sí» si sigue vigente o indica el dato correcto.`
        : fieldQuestions[field]);
    }
  }
  return scopeQuestion(profile);
}

function scopeQuestion(profile: BusinessProfile): Question {
  const names = profile.products.filter(product => product.status !== 'archived')
    .map(product => product.name.value).filter(Boolean);
  return question('selecting_growth_scope', names.length
    ? `Tengo estos productos de ${profile.companyName?.value}: ${names.join(', ')}. ¿Sobre cuál quieres trabajar hoy? También puedes escribir «nuevo: nombre», «actualizar: nombre» o «crecimiento general».`
    : '¿Qué producto o servicio quieres trabajar hoy? Escribe su nombre para agregarlo, o elige «crecimiento general».');
}

function selectProduct(conv: GrowthConversation, product: ProductProfile): Question {
  conv.structuredContext.selectedProductId = product.id;
  conv.structuredContext.growthScope = 'product';
  // Keep the existing strategy contract; the catalog itself is not copied into campaign context.
  conv.structuredContext.productOrService = product.name.value ?? '';
  return question('understanding_audience', 'Entendido. ¿Cuál es la audiencia objetivo a la que nos dirigimos?');
}

function newProduct(profile: BusinessProfile, name: string): ProductProfile {
  const now = new Date().toISOString();
  return {
    id: `product:${crypto.randomUUID()}`,
    tenantId: profile.tenantId, companyId: profile.companyId,
    name: knownBusinessField(name), status: 'active', createdAt: now, updatedAt: now,
  };
}

function applyProduct(session: BusinessOnboardingSession, product: ProductProfile): void {
  product.updatedAt = new Date().toISOString();
  const index = session.profile.products.findIndex(item => item.id === product.id);
  if (index < 0) session.profile.products.push(product);
  else session.profile.products[index] = product;
  session.profile.catalogReviewed = true;
  session.pending = undefined;
  session.describingProductId = undefined;
}

const campaignQuestions: Partial<Record<GrowthConversationStage, string>> = {
  understanding_audience: '¿Cuál es la audiencia objetivo a la que nos dirigimos?',
  understanding_region: '¿En qué región o mercado específico nos enfocaremos?',
  understanding_result: '¿Qué resultado medible esperas obtener con esto?',
  understanding_channels: '¿En qué canales o medios quieres desarrollar esta estrategia?',
  understanding_cta: '¿Cuál quieres que sea el llamado a la acción principal de la campaña?',
  executive_reflection: '¿La información de la campaña es correcta o deseas corregir algo más?',
};

function resumeCampaign(session: BusinessOnboardingSession): Question | undefined {
  const next = session.resumeQuestion;
  session.resumeQuestion = undefined;
  return next;
}

function descriptionQuestion(product: ProductProfile): Question {
  return question('understanding_product_description', product.description?.value
    ? `Descripción actual de ${product.name.value}: «${product.description.value}». Confirma con «sí» si sigue vigente o indica la nueva descripción.`
    : `¿Qué hace ${product.name.value}? Sólo necesito una descripción breve.`);
}

/** Local onboarding only: never writes to storage, nor learns permanent facts from campaign turns. */
export function handleBusinessOnboarding(
  session: BusinessOnboardingSession,
  conv: GrowthConversation,
  input: string,
): Question | null {
  const value = input.trim();
  const { profile } = session;

  // An explicit update command can interrupt intake without becoming campaign data.
  const campaignQuestion = campaignQuestions[conv.currentStage];
  if (campaignQuestion && /^(actualizar|actualiza)(:|\s)+/i.test(value)) {
    const name = value.replace(/^(actualizar|actualiza)(:|\s)+/i, '').trim();
    const matches = profile.products.filter(product => product.status !== 'archived' &&
      (normalize(product.name.value ?? '') === normalize(name) || product.id === name));
    if (matches.length !== 1) {
      return question(conv.currentStage, `Indica «actualizar: ID» con un producto del catálogo: ${profile.products.filter(product => product.status !== 'archived').map(product => `${product.name.value} (${product.id})`).join(', ')}. ${campaignQuestion}`);
    }
    session.resumeQuestion = question(conv.currentStage, campaignQuestion);
    session.describingProductId = matches[0].id;
    return descriptionQuestion(matches[0]);
  }

  switch (conv.currentStage) {
    case 'understanding_business_profile': {
      const field = fields.find(key => !isKnownBusinessField(getField(profile, key)));
      if (!field) return nextBusinessQuestion(session);
      const current = getField(profile, field);
      if (current?.value?.trim() && no(value)) {
        return question('understanding_business_profile', fieldQuestions[field]);
      }
      if (current?.value?.trim() && !yes(value)) {
        session.pending = { kind: 'field', field, value };
        return question('confirming_knowledge_update',
          `¿Confirmas cambiar «${current.value}» por «${value}» en el perfil de esta sesión? Responde sí o no.`);
      }
      setField(profile, field, current?.value?.trim() && yes(value) ? current.value : value);
      return nextBusinessQuestion(session);
    }
    case 'understanding_catalog': {
      if (companyScope(value)) {
        profile.catalogReviewed = true;
        return nextBusinessQuestion(session);
      }
      const names = [...new Map(value.split(/[,;\n]+/).map(name => name.trim())
        .filter(Boolean).map(name => [normalize(name), name])).values()];
      if (!names.length) return nextBusinessQuestion(session);
      session.pending = { kind: 'catalog', names };
      return question('confirming_knowledge_update',
        `¿Confirmas agregar ${names.join(', ')} al catálogo de esta sesión? Responde sí o no.`);
    }
    case 'selecting_growth_scope': {
      if (companyScope(value)) {
        conv.structuredContext.growthScope = 'company';
        conv.structuredContext.selectedProductId = undefined;
        conv.structuredContext.productOrService = `Crecimiento general de ${profile.companyName?.value}`;
        return question('understanding_audience', 'Entendido. ¿Cuál es la audiencia objetivo a la que nos dirigimos?');
      }
      const update = /^(actualizar|actualiza)(:|\s)+/i.test(value);
      const name = value.replace(/^(actualizar|actualiza|nuevo|agregar|agrega|añadir)(:|\s)+/i, '')
        .replace(/^(quiero\s+)?(lanzar|vender|comercializar|impulsar|trabajar(?:\s+(?:con|en))?)\s+/i, '').trim();
      if (!name) return scopeQuestion(profile);
      // Exact normalized names/IDs only: ambiguous prose must not silently select a product.
      const matches = profile.products.filter(product => product.status !== 'archived' &&
        (normalize(product.name.value ?? '') === normalize(name) || product.id === name));
      if (matches.length > 1) {
        return question('selecting_growth_scope',
          `Hay varios productos con ese nombre. Indica el ID: ${matches.map(product => product.id).join(', ')}.`);
      }
      const existing = matches[0];
      if (existing) {
        if (update || !isKnownBusinessField(existing.description) || !isKnownBusinessField(existing.name)) {
          session.describingProductId = existing.id;
          return descriptionQuestion(existing);
        }
        return selectProduct(conv, existing);
      }
      if (update) return question('selecting_growth_scope', `No encontré «${name}». ${scopeQuestion(profile).content}`);
      session.pending = { kind: 'product', product: newProduct(profile, name), isNew: true };
      return question('confirming_knowledge_update',
        `«${name}» todavía no está registrado. ¿Quieres incorporarlo como nuevo producto al catálogo de esta sesión? Responde sí o no.`);
    }
    case 'understanding_product_description': {
      const pending = session.pending;
      if (pending?.kind === 'product' && pending.isNew && pending.authorized) {
        if (no(value)) {
          session.pending = undefined;
          return scopeQuestion(profile);
        }
        if (yes(value)) return descriptionQuestion(pending.product);
        pending.product.description = knownBusinessField(value);
        applyProduct(session, pending.product);
        return selectProduct(conv, pending.product);
      }
      const existing = profile.products.find(product => product.id === session.describingProductId);
      if (!existing) return scopeQuestion(profile);
      if (yes(value) && existing.description?.value?.trim()) {
        existing.name = knownBusinessField(existing.name.value!);
        existing.description = knownBusinessField(existing.description.value);
        existing.updatedAt = new Date().toISOString();
        session.describingProductId = undefined;
        return resumeCampaign(session) ?? selectProduct(conv, existing);
      }
      if (no(value)) {
        session.describingProductId = undefined;
        return resumeCampaign(session) ?? scopeQuestion(profile);
      }
      if (yes(value)) return descriptionQuestion(existing);
      const product = { ...existing, description: knownBusinessField(value) };
      session.pending = { kind: 'product', product, isNew: false };
      return question('confirming_knowledge_update',
        `¿Confirmas actualizar la descripción de ${existing.name.value} a «${value}» en el catálogo de esta sesión? Responde sí o no.`);
    }
    case 'confirming_knowledge_update': {
      const pending = session.pending;
      if (!pending) return nextBusinessQuestion(session);
      if (!yes(value) && !no(value)) {
        return question('confirming_knowledge_update', 'Necesito una confirmación explícita: responde sí o no. No he cambiado el perfil ni el catálogo.');
      }
      if (no(value)) {
        session.pending = undefined;
        session.describingProductId = undefined;
        return resumeCampaign(session) ?? nextBusinessQuestion(session);
      }
      if (pending.kind === 'catalog') {
        for (const name of pending.names) {
          if (!profile.products.some(product => normalize(product.name.value ?? '') === normalize(name))) {
            profile.products.push(newProduct(profile, name));
          }
        }
        profile.catalogReviewed = true;
      } else if (pending.kind === 'field') {
        setField(profile, pending.field, pending.value);
      } else if (pending.isNew) {
        pending.authorized = true;
        return question('understanding_product_description',
          `¿Qué hace ${pending.product.name.value}? Sólo necesito una descripción breve; puedes cancelar con «no».`);
      } else {
        const product = pending.product;
        product.name = knownBusinessField(product.name.value!);
        applyProduct(session, product);
        return resumeCampaign(session) ?? selectProduct(conv, product);
      }
      session.pending = undefined;
      return nextBusinessQuestion(session);
    }
    default:
      return null;
  }
}
