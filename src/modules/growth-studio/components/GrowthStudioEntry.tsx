import React, { useState } from 'react';

import type {
  AuraIntelligenceContext,
} from '../../../types/auraIntelligence';

import {
  GrowthI18nProvider,
} from '../i18n/GrowthI18nProvider';

import { GrowthRuntimeProvider } from '../runtime/GrowthRuntimeProvider';

import ExecutiveConversationPage from './ExecutiveConversationPage';

import GrowthExecutiveOverview from '../product/GrowthExecutiveOverview';
import GrowthOpportunitiesWorkspace from '../product/GrowthOpportunitiesWorkspace';
import GrowthCampaignsWorkspace from '../product/GrowthCampaignsWorkspace';
import GrowthSettingsWorkspace from '../product/GrowthSettingsWorkspace';
import GrowthContentExecutionWorkspace from '../product/GrowthContentExecutionWorkspace';

import GrowthProductShell, {
  type GrowthProductSection,
} from '../product/GrowthProductShell';

interface GrowthStudioEntryProps {
  readonly context?: AuraIntelligenceContext;
  readonly companyName?: string;
}

export const GrowthStudioEntry: React.FC<
  GrowthStudioEntryProps
> = ({
  context,
  companyName,
}) => {
  const [activeSection, setActiveSection] =
    useState<GrowthProductSection>('overview');

  const openSection = (
    section: GrowthProductSection,
  ) => {
    setActiveSection(section);
  };

  return (
    <GrowthI18nProvider>
      <GrowthRuntimeProvider
        context={context}
        companyName={companyName}
      >
        <div id="growth-studio-entry">
        <GrowthProductShell
        activeSection={activeSection}
        onSectionChange={openSection}
      >
        {activeSection === 'overview' && (
          <GrowthExecutiveOverview
            onOpenAdvisor={() =>
              openSection('advisor')
            }
            onOpenOpportunities={() =>
              openSection('opportunities')
            }
            onOpenCampaigns={() =>
              openSection('campaigns')
            }
            onOpenIntelligence={() =>
              openSection('intelligence')
            }
          />
        )}

        {activeSection === 'opportunities' && (
          <GrowthOpportunitiesWorkspace />
        )}
        {activeSection === 'campaigns' && (
          <GrowthCampaignsWorkspace
            onOpenAdvisor={() =>
              openSection('advisor')
            }
          />
        )}
        {activeSection === 'content' && (
          <GrowthContentExecutionWorkspace
            onOpenAdvisor={() =>
              openSection('advisor')
            }
            onOpenCampaigns={() =>
              openSection('campaigns')
            }
          />
        )}
        {activeSection === 'settings' && (
          <GrowthSettingsWorkspace
            context={context}
            companyName={companyName}
          />
        )}
        {activeSection === 'advisor' && (
          <ExecutiveConversationPage
            onClose={() =>
              openSection('overview')
            }
          />
        )}
        </GrowthProductShell>
        </div>
      </GrowthRuntimeProvider>
    </GrowthI18nProvider>
  );
};

export default GrowthStudioEntry;
