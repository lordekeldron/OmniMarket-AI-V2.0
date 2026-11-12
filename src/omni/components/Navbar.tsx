// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState } from 'react';
import {
  TrendingUp, Sparkles, LayoutDashboard, Users, Share2, MessageSquare, FileText, Presentation,
  Plus, ChevronDown, Printer, Target, LineChart, Bot, LogOut, ShieldCheck, Menu, X, Cpu, Plug,
} from 'lucide-react';
import { BrandProfile, UserProfile } from '../types';

interface NavbarProps {
  currentUser?: UserProfile | null;
  brands: BrandProfile[];
  activeBrand: BrandProfile;
  onSelectBrand: (brand: BrandProfile) => void;
  onOpenNewBrandModal: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSlideDeck: () => void;
  onTriggerPrint: () => void;
  onLogout?: () => void;
}

export const navGroups = [
  {
    label: 'Inteligência',
    items: [
      { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
      { id: 'trends', label: 'Tendências', icon: TrendingUp },
      { id: 'audience', label: 'Audiência', icon: Target },
      { id: 'competitors', label: 'Concorrentes', icon: Users },
    ],
  },
  {
    label: 'Execução',
    items: [
      { id: 'agents', label: 'Agentes', icon: Bot },
      { id: 'campaigns', label: 'Campanhas', icon: Sparkles },
      { id: 'social', label: 'Social', icon: Share2 },
      { id: 'support', label: 'Atendimento', icon: MessageSquare },
    ],
  },
  {
    label: 'Resultados',
    items: [
      { id: 'roi', label: 'ROI', icon: LineChart },
      { id: 'report', label: 'Relatório', icon: FileText },
      { id: 'connections', label: 'Contas', icon: Plug },
    ],
  },
];

export const tabLabel = (id: string) =>
  navGroups.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? '';

export const Navbar: React.FC<NavbarProps> = ({
  currentUser, brands, activeBrand, onSelectBrand, onOpenNewBrandModal,
  activeTab, onSelectTab, onOpenSlideDeck, onTriggerPrint, onLogout,
}) => {
  const [brandOpen, setBrandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="relative w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow">
          <Cpu className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[15px] text-foreground">OmniMarket<span className="text-primary">.ai</span></div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Command center</div>
        </div>
      </div>

      {/* Brand switcher */}
      <div className="relative px-3 pt-4">
        <button
          type="button"
          onClick={() => setBrandOpen(!brandOpen)}
          className="w-full flex items-center gap-3 rounded-lg border border-sidebar-border bg-secondary/40 px-3 py-2.5 text-left hover:border-primary/40 transition-colors"
          aria-expanded={brandOpen}
          aria-label="Selecionar marca ativa"
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-primary/10" style={{ backgroundColor: activeBrand.accentColor }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{activeBrand.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{activeBrand.industry}</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${brandOpen ? 'rotate-180' : ''}`} />
        </button>
        {brandOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBrandOpen(false)} />
            <div className="absolute left-3 right-3 mt-2 surface bg-popover shadow-2xl py-1.5 z-50">
              <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Marcas</div>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onSelectBrand(b); setBrandOpen(false); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm hover:bg-primary/5"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.accentColor }} />
                  <span className="truncate flex-1 text-foreground">{b.name}</span>
                  {b.id === activeBrand.id && <span className="font-mono text-[10px] text-primary">ATIVA</span>}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => { setBrandOpen(false); onOpenNewBrandModal(); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm text-primary hover:bg-primary/5"
                >
                  <Plus className="w-4 h-4" /> Nova marca
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { onSelectTab(item.id); setMobileOpen(false); }}
                    className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary glow" />}
                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {currentUser && (
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-mono text-[11px] font-semibold">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-foreground">{currentUser.name}</div>
              <div className="flex items-center gap-1 text-[10px] text-accent">
                <ShieldCheck className="w-3 h-3" /> Sincronizado
              </div>
            </div>
            {onLogout && (
              <button type="button" onClick={onLogout} aria-label="Sair da conta" className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-sidebar/90 backdrop-blur-xl border-r border-sidebar-border z-30 print:hidden">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 print:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar border-r border-sidebar-border">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" className="absolute right-3 top-4 p-1.5 text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 lg:pl-64 bg-background/70 backdrop-blur-xl border-b border-border print:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                {activeBrand.name} <span className="text-primary">/</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground truncate">{tabLabel(activeTab)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Ao vivo
            </span>
            <button type="button" onClick={onOpenSlideDeck} aria-label="Abrir apresentação em slides" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <Presentation className="w-4 h-4" /><span className="hidden sm:inline">Slides</span>
            </button>
            <button type="button" onClick={onTriggerPrint} aria-label="Exportar relatório em PDF" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-glow glow transition-colors">
              <Printer className="w-4 h-4" /><span className="hidden sm:inline">Exportar PDF</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
