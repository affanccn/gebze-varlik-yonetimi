import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../router/paths';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6 border border-rose-100 shadow-xs">
        <FileQuestion className="w-10 h-10" />
      </div>

      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-3">
        404 - SAYFA BULUNAMADI
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Aradığınız Sayfa Mevcut Değil
      </h1>

      <p className="text-sm text-slate-500 max-w-md mb-8">
        Ulaşmaya çalıştığınız adres sistemde bulunamadı veya taşınmış olabilir.
        Lütfen bağlantı adresini kontrol ediniz veya panoya dönünüz.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </button>

        <button
          type="button"
          onClick={() => navigate(PATHS.DASHBOARD)}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ana Panoya Git
        </button>
      </div>
    </div>
  );
};

