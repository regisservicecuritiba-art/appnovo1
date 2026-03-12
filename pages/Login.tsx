import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '../services/firebase';
import { Logo } from '../components/Logo';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Lógica para definir ADMIN ou TECNICO
        const role = email.trim().toLowerCase() === 'regisservicecuritiba@gmail.com' ? 'ADMIN' : 'TECNICO';

        // Update profile in Firebase Auth
        await updateProfile(userCredential.user, {
          displayName: name,
        });

        // The role will be handled by the app logic or we could use custom claims, 
        // but for now we'll rely on the email check in the app and rules.
        
        alert('Cadastro realizado! Bem-vindo.');
      }
    } catch (err: any) {
      console.error(err);
      let message = 'Erro na autenticação.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Email ou senha incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este email já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Email inválido.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{isLogin ? 'Acesso ao Sistema' : 'Criar Conta'}</h2>
          <p className="text-gray-500 text-sm">{isLogin ? 'Entre com suas credenciais' : 'Preencha os dados abaixo'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
               <input
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-brand-blue"
                 required
               />
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-brand-blue"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-brand-blue"
              placeholder="******"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-orange to-brand-blue text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-brand-blue hover:underline"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>
        
        {!isLogin && (
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800 text-center">
                O e-mail <strong>regisservicecuritiba@gmail.com</strong> será cadastrado como ADMIN. Outros serão TÉCNICOS.
            </div>
        )}
      </div>
    </div>
  );
};