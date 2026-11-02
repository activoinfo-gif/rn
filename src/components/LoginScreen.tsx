import React from 'react';

interface LoginScreenProps {
  modoNoturno: boolean;
  logoCustomizado: string;
  logoAltura: number;
  inputUser: string;
  setInputUser: (v: string) => void;
  inputPass: string;
  setInputPass: (v: string) => void;
  onLogin: (e: React.FormEvent) => void;
}

export function LoginScreen({
  modoNoturno,
  logoCustomizado,
  logoAltura,
  inputUser,
  setInputUser,
  inputPass,
  setInputPass,
  onLogin
}: LoginScreenProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${modoNoturno ? 'bg-slate-950 text-white' : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'}`}>
      <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white'} rounded-3xl max-w-md w-full p-8 shadow-2xl border`}>
        <div className="flex items-center justify-center mb-6">
          <img src={logoCustomizado} alt="RN Infocell" style={{ height: `${logoAltura}px` }} className="w-auto object-contain drop-shadow-md" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
        </div>
        <h2 className={`text-xl font-black text-center mb-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>RN INFOCELL</h2>
        <p className="text-xs text-center text-slate-400 mb-2 font-medium">Especialista em Apple — Sistema de Gestão</p>
        <p className="text-[10px] text-center text-blue-500 font-mono mb-8">v1.0.0</p>

        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Usuário</label>
            <input
              type="text"
              autoFocus
              required
              value={inputUser}
              onChange={e => setInputUser(e.target.value)}
              className={`w-full border rounded-2xl p-4 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-4 focus:ring-blue-500/20`}
              placeholder="Ex: admin"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Senha</label>
            <input
              type="password"
              required
              value={inputPass}
              onChange={e => setInputPass(e.target.value)}
              className={`w-full border rounded-2xl p-4 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-4 focus:ring-blue-500/20`}
              placeholder="••••"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition">
            Entrar no Sistema
          </button>
        </form>
        <p className="text-[11px] text-slate-400 text-center mt-6">Usuário inicial: <strong>admin</strong> | Senha: <strong>123</strong></p>
      </div>
    </div>
  );
}