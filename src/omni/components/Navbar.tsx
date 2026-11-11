import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  BarChart3,
  Users,
  Share2,
  MessageSquare,
  FileText,
  Presentation,
  Plus,
  ChevronDown,
  Printer,
  Target,
  ArrowUpRight,
  Bot,
  User,
  LogOut,
  ShieldCheck,
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

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  brands,
  activeBrand,
  onSelectBrand,
  onOpenNewBrandModal,
  activeTab,
  onSelectTab,
  onOpenSlideDeck,
  onTriggerPrint,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Visão geral', icon: BarChart3 },
    { id: 'agents', label: 'Agentes', icon: Bot },
    { id: 'trends', label: 'Tendências', icon: TrendingUp },
    { id: 'campaigns', label: 'Campanhas', icon: Sparkles },
    { id: 'audience', label: 'Audiência', icon: Target },
    { id: 'roi', label: 'ROI', icon: ArrowUpRight },
    { id: 'competitors', label: 'Concorrentes', icon: Users },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'support', label: 'Atendimento', icon: MessageSquare },
    { id: 'report', label: 'Relatório', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#1c201d]/95 backdrop-blur-md border-b border-white/8 text-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-md bg-[#c56a38] text-[#1a120c] flex items-center justify-center font-semibold text-sm">
                OM
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-[15px] text-[#f7f3ee]">OmniMarket</div>
                <p className="text-[11px] text-[#8a8174] hidden md:block">Marketing e retorno</p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md hover:bg-white/5 text-sm transition-colors"
                aria-expanded={dropdownOpen}
                aria-label="Selecionar marca ativa"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeBrand.accentColor }} />
                <span className="max-w-[160px] truncate text-[#efe7dc]">{activeBrand.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8a8174]" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-72 bg-[#221f1b] border border-white/10 rounded-lg shadow-xl py-1.5 z-50">
                    <div className="px-3 py-1.5 text-[11px] text-[#8a8174]">Marcas</div>
                    {brands.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onSelectBrand(b);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-sm hover:bg-white/5 ${
                          b.id === activeBrand.id ? 'text-[#f7f3ee]' : 'text-[#ddd4c8]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.accentColor }} />
                          <div className="min-w-0">
                            <div className="truncate">{b.name}</div>
                            <div className="text-xs text-[#8a8174] truncate">{b.industry}</div>
                          </div>
                        </div>
                        {b.id === activeBrand.id && <span className="text-[11px] text-[#e0a06a]">Atual</span>}
                      </button>
                    ))}
                    <div className="border-t border-white/8 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenNewBrandModal();
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm text-[#e0a06a] hover:bg-white/5"
                      >
                        <Plus className="w-4 h-4" />
                        Nova marca
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSlideDeck}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#efe7dc] hover:bg-white/5 text-sm"
              aria-label="Abrir apresentação em slides"
            >
              <Presentation className="w-4 h-4" />
              <span className="hidden sm:inline">Slides</span>
            </button>
            <button
              type="button"
              onClick={onTriggerPrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#c56a38] text-[#1a120c] text-sm font-medium hover:bg-[#d27845]"
              aria-label="Exportar relatório em PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Persistent User Profile & Logout Menu */}
            {currentUser && (
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-medium text-[#efe7dc] border border-white/10 transition-colors"
                  aria-label="Perfil do usuário"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-5 h-5 rounded-full bg-[#7e8f7b] text-[#171714] flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[110px] truncate hidden sm:inline">{currentUser.name}</span>
                  <ChevronDown className="w-3 h-3 text-[#8a8174]" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-[#221f1b] border border-white/10 rounded-xl shadow-2xl py-2 z-50 text-xs">
                      <div className="px-3.5 py-2 border-b border-white/10">
                        <div className="font-semibold text-white">{currentUser.name}</div>
                        <div className="text-[11px] text-[#8a8174] truncate">{currentUser.email}</div>
                        {currentUser.company && (
                          <div className="text-[10px] text-[#b5d4a6] mt-0.5">{currentUser.company}</div>
                        )}
                      </div>

                      <div className="px-3.5 py-2 text-[10px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 mx-2 my-1.5 rounded-lg border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Cadastro salvo & sincronizado</span>
                      </div>

                      {onLogout && (
                        <div className="pt-1 mt-1 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              onLogout();
                            }}
                            className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-red-300 hover:bg-red-500/10 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sair da conta</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-0.5 overflow-x-auto pb-1 -mb-px scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-2 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#c56a38] text-[#f7f3ee]'
                    : 'border-transparent text-[#8a8174] hover:text-[#efe7dc]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
