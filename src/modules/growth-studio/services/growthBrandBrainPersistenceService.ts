import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

import {
  db,
} from '../../../firebase';

import {
  GROWTH_COLLECTIONS,
} from '../config/growthStudioCollections';

import type {
  BrandBrain,
  BrandBrainField,
  KnownFact,
  KnowledgeGap,
} from '../types/brandBrain';

export interface GrowthBrandBrainSettingsInput {
  readonly companyName: string;
  readonly businessDescription: string;
  readonly industry: string;
  readonly products: string[];
  readonly valueProposition: string;
  readonly targetAudience: string;
  readonly brandTone: string;
  readonly differentiators: string[];
  readonly communicationStyle: string;
  readonly businessGoals: string[];
}

const textField = (
  value: string,
): BrandBrainField<string> => {
  const normalized =
    value.trim();

  if (!normalized) {
    return {
      value: null,
      status: 'missing',
      confidence: 'low',
    };
  }

  return {
    value: normalized,
    status: 'confirmed',
    confidence: 'high',
    source: 'growth_settings',
    evidence: 'Confirmado en Configuración de Aura Growth.',
  };
};

const listField = (
  values: string[],
): BrandBrainField<string[]> => {
  const normalized =
    values
      .map((value) => value.trim())
      .filter(Boolean);

  if (normalized.length === 0) {
    return {
      value: null,
      status: 'missing',
      confidence: 'low',
    };
  }

  return {
    value: Array.from(
      new Set(normalized),
    ),
    status: 'confirmed',
    confidence: 'high',
    source: 'growth_settings',
    evidence: 'Confirmado en Configuración de Aura Growth.',
  };
};

const isPresent = (
  field:
    | BrandBrainField<string>
    | BrandBrainField<string[]>,
): boolean => {
  if (Array.isArray(field.value)) {
    return field.value.length > 0;
  }

  return Boolean(
    field.value &&
      String(field.value).trim(),
  );
};

const addFact = (
  facts: KnownFact[],
  field: string,
  value: unknown,
): void => {
  facts.push({
    field,
    value,
    source: 'growth_settings',
    status: 'confirmed',
  });
};

const addGap = (
  gaps: KnowledgeGap[],
  field: string,
  label: string,
  importance:
    | 'high'
    | 'medium'
    | 'low',
): void => {
  gaps.push({
    field,
    label,
    importance,
  });
};

export const isPersistableGrowthCompanyId = (
  companyId?: string | null,
): boolean =>
  Boolean(
    companyId &&
      companyId.trim() &&
      companyId !== 'aura_demo' &&
      companyId !== 'growth_demo_company',
  );

export const buildBrandBrainFromSettings = (
  companyId: string,
  input: GrowthBrandBrainSettingsInput,
  existing?: BrandBrain | null,
): BrandBrain => {
  if (
    !isPersistableGrowthCompanyId(
      companyId,
    )
  ) {
    throw new Error(
      'INVALID_GROWTH_COMPANY_CONTEXT',
    );
  }

  const companyName =
    textField(input.companyName);

  const businessDescription =
    textField(
      input.businessDescription,
    );

  const industry =
    textField(input.industry);

  const products =
    listField(input.products);

  const valueProposition =
    textField(
      input.valueProposition,
    );

  const targetAudience =
    textField(
      input.targetAudience,
    );

  const brandTone =
    textField(input.brandTone);

  const differentiators =
    listField(
      input.differentiators,
    );

  const communicationStyle =
    textField(
      input.communicationStyle,
    );

  const businessGoals =
    listField(
      input.businessGoals,
    );

  const knownFacts: KnownFact[] =
    [];

  const missingKnowledge:
    KnowledgeGap[] = [];

  let confidenceScore = 0;

  if (isPresent(companyName)) {
    confidenceScore += 5;
    addFact(
      knownFacts,
      'companyProfile.companyName',
      companyName.value,
    );
  } else {
    addGap(
      missingKnowledge,
      'companyProfile.companyName',
      'Nombre de la empresa',
      'high',
    );
  }

  if (
    isPresent(
      businessDescription,
    )
  ) {
    confidenceScore += 5;
    addFact(
      knownFacts,
      'companyProfile.businessDescription',
      businessDescription.value,
    );
  } else {
    addGap(
      missingKnowledge,
      'companyProfile.businessDescription',
      'Descripción del negocio',
      'high',
    );
  }

  const weightedFields = [
    {
      key: 'industry',
      label: 'Industria',
      importance: 'high' as const,
      weight: 15,
      field: industry,
    },
    {
      key: 'products',
      label: 'Productos y servicios',
      importance: 'high' as const,
      weight: 15,
      field: products,
    },
    {
      key: 'valueProposition',
      label: 'Propuesta de valor',
      importance: 'high' as const,
      weight: 15,
      field: valueProposition,
    },
    {
      key: 'targetAudience',
      label: 'Audiencia objetivo',
      importance: 'high' as const,
      weight: 15,
      field: targetAudience,
    },
    {
      key: 'brandTone',
      label: 'Tono de marca',
      importance: 'medium' as const,
      weight: 10,
      field: brandTone,
    },
    {
      key: 'differentiators',
      label: 'Diferenciadores',
      importance: 'medium' as const,
      weight: 10,
      field: differentiators,
    },
    {
      key: 'communicationStyle',
      label: 'Estilo de comunicación',
      importance: 'low' as const,
      weight: 5,
      field: communicationStyle,
    },
    {
      key: 'businessGoals',
      label: 'Metas de negocio',
      importance: 'medium' as const,
      weight: 5,
      field: businessGoals,
    },
  ];

  for (
    const definition of
    weightedFields
  ) {
    if (
      isPresent(
        definition.field,
      )
    ) {
      confidenceScore +=
        definition.weight;

      addFact(
        knownFacts,
        definition.key,
        definition.field.value,
      );
    } else {
      addGap(
        missingKnowledge,
        definition.key,
        definition.label,
        definition.importance,
      );
    }
  }

  const now =
    new Date().toISOString();

  return {
    id:
      existing?.id ||
      `bb_company_${companyId}`,
    tenantId: companyId,
    companyId,
    companyProfile: {
      companyName,
      businessDescription,
    },
    industry,
    products,
    valueProposition,
    targetAudience,
    brandTone,
    differentiators,
    communicationStyle,
    businessGoals,
    knownFacts,
    missingKnowledge,
    confidenceScore,
    createdAt:
      existing?.createdAt ||
      now,
    updatedAt: now,
  };
};

class GrowthBrandBrainPersistenceService {
  async getProfile(
    companyId: string,
  ): Promise<BrandBrain | null> {
    if (
      !isPersistableGrowthCompanyId(
        companyId,
      )
    ) {
      return null;
    }

    const snapshot =
      await getDoc(
        doc(
          db,
          GROWTH_COLLECTIONS
            .BRAND_BRAIN_PROFILES,
          companyId,
        ),
      );

    if (!snapshot.exists()) {
      return null;
    }

    const profile =
      snapshot.data() as BrandBrain;

    if (
      profile.companyId !==
        companyId ||
      profile.tenantId !==
        companyId
    ) {
      throw new Error(
        'INVALID_BRAND_BRAIN_COMPANY_BINDING',
      );
    }

    return profile;
  }

  async saveProfile(
    companyId: string,
    input:
      GrowthBrandBrainSettingsInput,
  ): Promise<BrandBrain> {
    if (
      !isPersistableGrowthCompanyId(
        companyId,
      )
    ) {
      throw new Error(
        'INVALID_GROWTH_COMPANY_CONTEXT',
      );
    }

    const existing =
      await this.getProfile(
        companyId,
      );

    const profile =
      buildBrandBrainFromSettings(
        companyId,
        input,
        existing,
      );

    await setDoc(
      doc(
        db,
        GROWTH_COLLECTIONS
          .BRAND_BRAIN_PROFILES,
        companyId,
      ),
      profile,
    );

    return profile;
  }
}

export const growthBrandBrainPersistenceService =
  new GrowthBrandBrainPersistenceService();