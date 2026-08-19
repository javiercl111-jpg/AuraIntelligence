import React, { useState } from 'react';

import ExecutiveConversationPage from './ExecutiveConversationPage';

import GrowthExecutiveOverview from '../product/GrowthExecutiveOverview';

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

        {activeSection === 'advisor' && (
          <ExecutiveConversationPage
            onClose={() =>
              openSection('overview')
            }
          />
        )}
      </GrowthProductShell>
    </div>
  );
};

export default GrowthStudioEntry;
