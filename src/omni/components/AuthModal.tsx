// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X, User, Building, Mail, ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { UserProfile } from '../types';
import { getRegisteredUsers, registerOrUpdateUser, loginUser, findUserByEmail } from '../utils/storage';

type AuthModalProps = {
  mode: 'signup' | 'login' | null;
  onClose: () => void;
  onSuccess: (user: UserProfile, isNew: boolean) => void;
};

export const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Gestor de Marketing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedUsers, setSavedUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (mode) {
      setActiveTab(mode);
      setErrorMsg(null);
      const list = getRegisteredUsers();
      setSavedUsers(list);
      if (list.length > 0 && !email) {
        setEmail(list[0].email);
        setName(list[0].name);
        setCompany(list[0].company || '');
      }
    }
  }, [mode]);

  if (!mode) return null;

  const handleQuickLogin = (u: UserProfile) => {
    const logged = loginUser(u.email);
    if (logged) {
      onSuccess(logged, false);
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor insira um e-mail válido.');
      return;
    }

    if (activeTab === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Por favor preencha seu nome completo.');
        return;
      }
      const result = registerOrUpdateUser(name, cleanEmail, company, role);
      onSuccess(result.user, result.isNew);
      onClose();
    } else {
      // Login mode
      const existing = findUserByEmail(cleanEmail);
      if (!existing) {
        // If not registered yet, inform and offer seamless registration
        setErrorMsg('E-mail não encontrado na base local. Clique em "Cadastrar" para criar sua conta.');
        return;
      }
      const logged = loginUser(cleanEmail);
      if (logged) {
        onSuccess(logged, false);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-md rounded-[2rem] border border-muted-foreground bg-foreground p-7 text-background shadow-2xl sm:p-9 max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-black/5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">OmniMarket AI</div>

        {/* Tab Selector: Cadastrar vs Entrar */}
        <div className="mt-4 flex items-center gap-1 rounded-xl bg-[#ede7dc] p-1 border border-[#ded7cb]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'signup'
                ? 'bg-white text-background shadow-xs'
                : 'text-[#726c63] hover:text-background'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Conta (Salvar)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-white text-background shadow-xs'
                : 'text-[#726c63] hover:text-background'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Já tenho Conta</span>
          </button>
        </div>

        <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-[-0.05em]">
          {activeTab === 'signup' ? 'Cadastro Persistente de Usuário' : 'Entrar no Workspace Salvo'}
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {activeTab === 'signup'
            ? 'Seus dados de perfil, marcas e campanhas serão salvos permanentemente neste navegador.'
            : 'Acesse seus dados salvos e continue sua operação exatamente de onde parou.'}
        </p>

        {/* Saved Accounts Quick Selection (if available) */}
        {savedUsers.length > 0 && activeTab === 'login' && (
          <div className="mt-4 p-3 rounded-xl bg-white/70 border border-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-2">
              Conta salva neste dispositivo
            </span>
            <div className="space-y-1.5">
              {savedUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[#f4efe5] hover:bg-[#eae2d3] text-left transition-colors border border-[#e2d9cc]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-background text-foreground flex items-center justify-center text-xs font-bold">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-background">{u.name}</div>
                      <div className="text-[11px] text-[#7b756b]">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-accent bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Entrar com 1 clique
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {activeTab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-border mb-1">
                Nome completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Bruno Dias"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white/80 border border-muted-foreground rounded-xl outline-hidden focus:border-accent focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-border mb-1">
              E-mail profissional *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-white/80 border border-muted-foreground rounded-xl outline-hidden focus:border-accent focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {activeTab === 'signup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-border mb-1">
                  Empresa / Organização
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Minha Marca"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white/80 border border-muted-foreground rounded-xl outline-hidden focus:border-accent focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-border mb-1">
                  Cargo / Função
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white/80 border border-muted-foreground rounded-xl outline-hidden focus:border-accent focus:ring-2 focus:ring-accent"
                >
                  <option value="Fundador / CEO">Fundador / CEO</option>
                  <option value="Diretor de Marketing (CMO)">Diretor de Marketing (CMO)</option>
                  <option value="Gestor de Tráfego / Performance">Gestor de Tráfego</option>
                  <option value="Estrategista de Marca">Estrategista de Marca</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-background px-4 py-3 text-xs font-semibold text-foreground shadow-md transition-all hover:bg-black hover:-translate-y-0.5"
          >
            {activeTab === 'signup' ? 'Cadastrar e Salvar Informações' : 'Entrar na Plataforma'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <div className="mt-5 space-y-1.5 border-t border-muted-foreground pt-4 text-[11px] text-[#7b756b]">
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-accent" />
            <span>Persistência garantida: seu login e marcas nunca se perdem ao recarregar a página</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>Isolamento seguro de dados para cada conta cadastrada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
