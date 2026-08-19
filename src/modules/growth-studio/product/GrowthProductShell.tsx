import React, { useState } from 'react';

import GrowthLanguageSelector from '../i18n/GrowthLanguageSelector';
import { useGrowthI18n } from '../i18n/GrowthI18nProvider';

import {
  BarChart3,
  Bell,
  BrainCircuit,
  BriefcaseBusiness,
  ChevronRight,
  CircleGauge,
  FileStack,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';

export type GrowthProductSection =
  | 'overview'
  | 'opportunities'
  | 'campaigns'
  | 'intelligence'
  | 'content'
  | 'performance'
  | 'advisor'
  | 'team'
  | 'notifications'
  | 'settings';

export interface GrowthProductShellProps {
  readonly activeSection?: GrowthProductSection;
  readonly onSectionChange?: (
    section: GrowthProductSection,
  ) => void;
  readonly children?: React.ReactNode;
}

interface NavigationItem {
  readonly id: GrowthProductSection;
  readonly labelKey:
    keyof ReturnType<
      typeof useGrowthI18n
    >['messages']['nav'];
  readonly descriptionKey:
    keyof ReturnType<
      typeof useGrowthI18n
    >['messages']['nav'];
  readonly icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}

const primaryNavigation: readonly NavigationItem[] = [
  {
    id: 'overview',
    labelKey: 'overview',
    descriptionKey: 'overviewDescription',
    icon: LayoutDashboard,
  },
  {
    id: 'opportunities',
    labelKey: 'opportunities',
    descriptionKey: 'opportunitiesDescription',
    icon: Target,
  },
  {
    id: 'campaigns',
    labelKey: 'campaigns',
    descriptionKey: 'campaignsDescription',
    icon: Megaphone,
  },
  {
    id: 'intelligence',
    labelKey: 'intelligence',
    descriptionKey: 'intelligenceDescription',
    icon: BrainCircuit,
  },
  {
    id: 'content',
    labelKey: 'contentExecution',
    descriptionKey: 'contentExecutionDescription',
    icon: FileStack,
  },
  {
    id: 'performance',
    labelKey: 'performance',
    descriptionKey: 'performanceDescription',
    icon: BarChart3,
  },
  {
    id: 'advisor',
    labelKey: 'advisor',
    descriptionKey: 'advisorDescription',
    icon: Sparkles,
  },
] as const;

const secondaryNavigation: readonly NavigationItem[] = [
  {
    id: 'team',
    labelKey: 'teamUsers',
    descriptionKey: 'teamUsersDescription',
    icon: Users,
  },
  {
    id: 'notifications',
    labelKey: 'notifications',
    descriptionKey: 'notificationsDescription',
    icon: Bell,
  },
  {
    id: 'settings',
    labelKey: 'settings',
    descriptionKey: 'settingsDescription',
    icon: Settings,
  },
] as const;

const GrowthProductShell: React.FC<
  GrowthProductShellProps
> = ({
  activeSection = 'overview',
  onSectionChange,
  children,
}) => {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] =
    useState(false);

  const {
    messages,
  } = useGrowthI18n();

  const titleBySection:
  Readonly<
    Record<GrowthProductSection, string>
  > = {
    overview: messages.overview.pageTitle,
    opportunities:
      messages.nav.opportunityTitle,
    campaigns:
      messages.nav.campaignTitle,
    intelligence:
      messages.nav.intelligenceTitle,
    content:
      messages.nav.contentExecution,
    performance:
      messages.nav.performance,
    advisor:
      messages.nav.advisor,
    team:
      messages.nav.teamUsers,
    notifications:
      messages.nav.notificationTitle,
    settings:
      messages.nav.settings,
  };

  const descriptionBySection:
  Readonly<
    Record<GrowthProductSection, string>
  > = {
    overview:
      messages.overview.pageDescription,
    opportunities:
      messages.opportunities.description,
    campaigns:
      messages.nav.campaignsDescription,
    intelligence:
      messages.nav.intelligenceDescription,
    content:
      messages.nav.contentExecutionDescription,
    performance:
      messages.nav.performanceDescription,
    advisor:
      messages.nav.advisorDescription,
    team:
      messages.nav.teamUsersDescription,
    notifications:
      messages.nav.notificationsDescription,
    settings:
      messages.nav.settingsDescription,
  };

  const handleSectionChange = (
    section: GrowthProductSection,
  ) => {
    onSectionChange?.(section);
    setIsMobileNavigationOpen(false);
  };

  const renderNavigationItem = (
    item: NavigationItem,
  ) => {
    const Icon = item.icon;
    const isActive = item.id === activeSection;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSectionChange(item.id)}
        className={[
          'group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition',
          isActive
            ? 'border-cyan-300/30 bg-cyan-300/10 text-white shadow-lg shadow-cyan-950/20'
            : 'border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
        ].join(' ')}
      >
        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition',
            isActive
              ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200'
              : 'border-white/10 bg-white/[0.03] text-white/45 group-hover:text-cyan-200',
          ].join(' ')}
        >
          <Icon size={19} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {messages.nav[item.labelKey]}
          </span>

          <span className="mt-0.5 block truncate text-[11px] font-medium text-white/35">
            {messages.nav[item.descriptionKey]}
          </span>
        </span>

        <ChevronRight
          size={15}
          className={
            isActive
              ? 'text-cyan-200'
              : 'text-white/20'
          }
        />
      </button>
    );
  };

  const navigation = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 px-5 py-5">
        <img
          src="/brand/aura-logo-official.png"
          alt="Aura"
          className="h-auto w-36 object-contain object-left"
        />

        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300/80">
            Aura Growth
          </p>

          <p className="mt-1 text-xs font-semibold text-white/35">
            {messages.nav.growthPlatform}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.28em] text-white/25">
          Aura Growth
        </p>

        <div className="space-y-1">
          {primaryNavigation.map(renderNavigationItem)}
        </div>

        <div className="my-4 border-t border-white/7" />

        <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.28em] text-white/25">
          {messages.nav.workspace}
        </p>

        <div className="space-y-1">
          {secondaryNavigation.map(renderNavigationItem)}
        </div>
      </div>

      <div className="border-t border-white/8 p-4">
        <div className="rounded-2xl border border-cyan-300/12 bg-gradient-to-br from-cyan-300/[0.07] to-blue-600/[0.03] p-4">
          <div className="flex items-center gap-2 text-cyan-200">
            <CircleGauge size={17} />

            <span className="text-xs font-black">
              {messages.nav.growthIntelligence}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-white/40">
            {messages.nav.intelligenceFlow}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative min-h-[760px] overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f] text-white shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.10),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.10),_transparent_32%)]" />

      <div className="relative flex min-h-[760px]">
        <aside className="hidden w-[286px] shrink-0 border-r border-white/8 bg-black/15 lg:block">
          {navigation}
        </aside>

        {isMobileNavigationOpen && (
          <div className="absolute inset-0 z-40 flex lg:hidden">
            <button
              type="button"
              aria-label={messages.nav.closeNavigation}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsMobileNavigationOpen(false)}
            />

            <aside className="relative z-10 h-full w-[286px] border-r border-white/10 bg-[#08111f] shadow-2xl">
              {navigation}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="flex min-h-[92px] items-center justify-between gap-4 border-b border-white/8 bg-black/10 px-5 py-4 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label={messages.nav.openNavigation}
                onClick={() => setIsMobileNavigationOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/65 transition hover:bg-white/[0.07] lg:hidden"
              >
                {isMobileNavigationOpen ? (
                  <X size={19} />
                ) : (
                  <Menu size={19} />
                )}
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300/70">
                  Aura Growth
                </p>

                <h2 className="mt-1 truncate text-xl font-black tracking-tight md:text-2xl">
                  {titleBySection[activeSection]}
                </h2>

                <p className="mt-1 hidden max-w-3xl text-xs font-medium leading-relaxed text-white/35 md:block">
                  {descriptionBySection[activeSection]}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <GrowthLanguageSelector />
              <button
                type="button"
                onClick={() =>
                  handleSectionChange('notifications')
                }
                aria-label={messages.nav.openNotifications}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.06] hover:text-cyan-200"
              >
                <Bell size={18} />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSectionChange('settings')
                }
                aria-label={messages.nav.openSettings}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.06] hover:text-cyan-200"
              >
                <Settings size={18} />
              </button>

              <div className="ml-1 hidden items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <BriefcaseBusiness size={16} />
                </div>

                <div>
                  <p className="text-xs font-bold text-white/80">
                    Aura Growth
                  </p>

                  <p className="text-[10px] font-semibold text-white/30">
                    {messages.nav.enterprise}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="p-5 md:p-7">
            {children ?? (
              <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200">
                    <CircleGauge size={24} />
                  </div>

                  <h3 className="mt-5 text-lg font-black">
                    {titleBySection[activeSection]}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    {descriptionBySection[activeSection]}
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default GrowthProductShell;
