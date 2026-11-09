import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { AssetAssignment } from '../../types/assignment';

interface AssignmentSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssetAssignment | null;
}

export const AssignmentSlipModal: React.FC<AssignmentSlipModalProps> = ({
  isOpen,
  onClose,
  assignment,
}) => {
  if (!isOpen || !assignment) return null;

  const handlePrint = () => {
    window.print();
  };

  const docNo = assignment.documentNo || `ZMT-2026-${String(assignment.id).padStart(6, '0')}`;
  const assignDate = assignment.assignedAt || new Date().toLocaleDateString('tr-TR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar - Not printed */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Resmi Zimmet Fişi (A4)</h2>
              <p className="text-xs text-slate-500">Taşınır Mal Yönetmeliği Taşınır Teslim Belgesi.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              Yazdır (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document */}
        <div className="p-8 overflow-y-auto bg-white font-sans text-slate-800 print:p-0 print:m-0">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-sm font-extrabold tracking-wider text-slate-900 uppercase">T.C. GEBZE BELEDİYESİ</div>
            <div className="text-xs font-semibold text-slate-600 uppercase mt-0.5">MALİ HİZMETLER MÜDÜRLÜĞÜ — TAŞINIR KAYIT VE KONTROL BİRİMİ</div>
            <div className="text-base font-black text-slate-900 mt-2 tracking-wide uppercase">
              TAŞINIR TESLİM VE ZİMMET SENEDİ
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-400">
            <div>
              <div className="mb-1.5"><strong className="text-slate-700">Zimmet Belge No:</strong> <span className="font-mono font-bold text-indigo-900">{docNo}</span></div>
              <div className="mb-1.5"><strong className="text-slate-700">Teslim Tarihi:</strong> {assignDate}</div>
              <div><strong className="text-slate-700">Teslim Yeri / Oda:</strong> {assignment.location || 'Belediye Hizmet Binası'}</div>
            </div>
            <div>
              <div className="mb-1.5"><strong className="text-slate-700">Zimmet Alan Personel:</strong> <span className="font-bold text-slate-900">{assignment.assigneeName}</span></div>
              <div className="mb-1.5"><strong className="text-slate-700">Sicil No:</strong> <span className="font-mono">{assignment.personnelId ? `SCL-${assignment.personnelId}` : 'Kayıtlı Sicil'}</span></div>
              <div><strong className="text-slate-700">Müdürlük / Birim:</strong> {assignment.unit || 'Belediye Birimi'}</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-200">
                <th className="border border-slate-300 px-3 py-2 text-center w-12">S.No</th>
                <th className="border border-slate-300 px-3 py-2 w-32">Barkod No</th>
                <th className="border border-slate-300 px-3 py-2">Demirbaş Varlık Tanımı</th>
                <th className="border border-slate-300 px-3 py-2 w-28">Kategori</th>
                <th className="border border-slate-300 px-3 py-2 text-center w-24">Teslim Durumu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-3 text-center font-mono">1</td>
                <td className="border border-slate-300 px-3 py-3 font-mono font-bold text-slate-900">
                  {assignment.assetCode || `VRK-${assignment.assetId}`}
                </td>
                <td className="border border-slate-300 px-3 py-3 font-medium text-slate-800">
                  {assignment.assetName || 'Kurumsal Demirbaş Varlık'}
                </td>
                <td className="border border-slate-300 px-3 py-3 text-slate-600">
                  Demirbaş
                </td>
                <td className="border border-slate-300 px-3 py-3 text-center">
                  <span className="font-bold text-emerald-700">Eksiksiz / Faal</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Commitment Text */}
          <div className="text-[10px] text-slate-600 leading-relaxed mb-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-justify print:bg-white print:border-slate-300">
            <strong>Taahhütname:</strong> Yukarıda marka, model, seri numarası ve barkodu belirtilen taşınır mal / demirbaş, belediyemizdeki görevim süresince kullanılmak ve muhafaza edilmek üzere tarafıma eksiksiz ve çalışır vaziyette teslim edilmiştir. Görevimden ayrılmam, birim değiştirmem veya idarece talep edilmesi halinde söz konusu taşınırı Taşınır Mal Yönetmeliği hükümleri doğrultusunda aynen ve noksansız olarak ambar / taşınır kayıt yetkilisine teslim etmeyi kabul ve taahhüt ederim.
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 pt-6">
            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">TESLİM EDEN</div>
              <div className="text-slate-600 mt-1">Taşınır Kayıt ve Kontrol Yetkilisi</div>
              <div className="text-[10px] text-slate-400 mt-1">İmza / Mühür</div>
              <div className="h-16"></div>
            </div>

            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">TESLİM ALAN (ZİMMET SAHİBİ)</div>
              <div className="text-slate-600 mt-1">{assignment.assigneeName}</div>
              <div className="text-[10px] text-slate-400 mt-1">İmza</div>
              <div className="h-16"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
