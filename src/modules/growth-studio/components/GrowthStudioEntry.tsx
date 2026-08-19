import React, { useState } from 'react';

import {
  GrowthI18nProvider,
} from '../i18n/GrowthI18nProvider';

import { GrowthRuntimeProvider } from '../runtime/GrowthRuntimeProvider';

import ExecutiveConversationPage from './ExecutiveConversationPage';

import GrowthExecutiveOverview from '../product/GrowthExecutiveOverview';
import GrowthOpportunitiesWorkspace from '../product/GrowthOpportunitiesWorkspace';
import GrowthCampaignsWorkspace from '../product/GrowthCampaignsWorkspace';

import GrowthProductShell, {
  type GrowthProductSection,
} from '../product/GrowthProductShell';

export const GrowthStudioEntry: React.FC = () => {
  const [activeSection, setActiveSection] =
    useState<GrowthProductSection>('overview');

  const openSection = (
    section: GrowthProductSection,
  ) => {
    setActiveSection(section);
  };

  return (
    <GrowthI18nProvider>
      <GrowthRuntimeProvider>
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
