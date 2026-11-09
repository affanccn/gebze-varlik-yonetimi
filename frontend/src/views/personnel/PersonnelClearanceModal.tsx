import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Personnel } from '../../types/personnel';
import { AssetAssignment } from '../../types/assignment';
import { assignmentService } from '../../services/assignmentService';

interface PersonnelClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  activeAssignments?: AssetAssignment[];
}

export const PersonnelClearanceModal: React.FC<PersonnelClearanceModalProps> = ({
  isOpen,
  onClose,
  personnel,
  activeAssignments: propActiveAssignments,
}) => {
  const { data: assignmentsData } = useQuery({
    queryKey: ['personnel-clearance-assignments', personnel?.id],
    queryFn: () => assignmentService.getAll({ personnelId: personnel!.id, size: 200 }),
    enabled: isOpen && personnel != null && !propActiveAssignments,
  });

  if (!isOpen || !personnel) return null;

  const handlePrint = () => {
    window.print();
  };

  const allAssignments = propActiveAssignments || assignmentsData?.items || [];
  const activeAssignments = allAssignments.filter((a) => a.status === 'AKTIF');
  const hasPendingAssets = activeAssignments.length > 0;
  const currentDate = new Date().toLocaleDateString('tr-TR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar - Not printed */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${hasPendingAssets ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Personel İlişik Kesme Tutanağı (A4)</h2>
              <p className="text-xs text-slate-500">Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
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
            <div className="text-xs font-semibold text-slate-600 uppercase mt-0.5">İNSAN KAYNAKLARI VE EĞİTİM MÜDÜRLÜĞÜ & MALİ HİZMETLER MÜDÜRLÜĞÜ</div>
            <div className="text-base font-black text-slate-900 mt-2 tracking-wide uppercase">
              TAŞINIR MAL VE ZİMMET İLİŞİK KESME BELGESİ
            </div>
          </div>

          {/* Personnel Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-400">
            <div>
              <div className="mb-1.5"><strong className="text-slate-700">Personel Adı Soyadı:</strong> <span className="font-bold text-slate-900">{personnel.fullName || `${personnel.firstName} ${personnel.lastName}`}</span></div>
              <div className="mb-1.5"><strong className="text-slate-700">Kurum Sicil Numarası:</strong> <span className="font-mono font-bold text-blue-900">{personnel.registrationNumber}</span></div>
              <div><strong className="text-slate-700">T.C. Kimlik / Ünvan:</strong> {personnel.title || 'Belediye Personeli'}</div>
            </div>
            <div>
              <div className="mb-1.5"><strong className="text-slate-700">Görev Yeri / Müdürlük:</strong> {personnel.departmentName || 'Belirtilmedi'}</div>
              <div className="mb-1.5"><strong className="text-slate-700">Kontrol Tarihi:</strong> {currentDate}</div>
              <div><strong className="text-slate-700">Durum:</strong> {personnel.isActive === 1 ? 'Görevde' : 'Ayrılmış / Pasif'}</div>
            </div>
          </div>

          {/* Clearance Verdict Box */}
          {!hasPendingAssets ? (
            <div className="p-4 mb-6 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-start gap-3 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                  İLİŞİK KESİLMESİ UYGUNDUR (ZİMMET KAYDI BULUNMAMAKTADIR)
                </div>
                <div className="text-xs mt-1 leading-relaxed text-emerald-700">
                  Kurumsal Varlık Yönetim Sistemi üzerinde yapılan sorgulamada, yukarıda kimlik ve sicil bilgileri belirtilen personelin üzerinde kayıtlı herhangi bir zimmetli taşınır mal, bilişim donanımı veya araç/gereç bulunmamaktadır. Taşınır zimmet ve ambar kontrolü açısından ilişiğinin kesilmesinde sakınca yoktur.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 mb-6 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-start gap-3 text-rose-900">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-rose-800">
                  İLİŞİK KESİLEMEZ — ÜZERİNDE AKTİF ZİMMET BULUNMAKTADIR ({activeAssignments.length} ADET)
                </div>
                <div className="text-xs mt-1 leading-relaxed text-rose-700">
                  Personel üzerinde halen iade edilmemiş aşağıdaki demirbaşlar kayıtlıdır. Tüm varlıklar ilgili ambar veya taşınır kayıt yetkilisine teslim edilip iade fişi kesilmeden ilişik kesme işlemi onaylanamaz.
                </div>
              </div>
            </div>
          )}

          {/* Pending Assets Table if any */}
          {hasPendingAssets && (
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-800 uppercase mb-2">Teslim Edilmesi Gereken Zimmetli Taşınırlar:</div>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200">
                    <th className="border border-slate-300 px-3 py-2 text-center w-12">S.No</th>
                    <th className="border border-slate-300 px-3 py-2 w-32">Barkod No</th>
                    <th className="border border-slate-300 px-3 py-2">Demirbaş Adı</th>
                    <th className="border border-slate-300 px-3 py-2 w-28">Kategori</th>
                    <th className="border border-slate-300 px-3 py-2 text-center w-24">Teslim Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssignments.map((a, idx) => (
                    <tr key={a.id}>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 px-3 py-2 font-mono font-bold text-rose-800">{a.assetCode}</td>
                      <td className="border border-slate-300 px-3 py-2 font-medium">{a.assetName}</td>
                      <td className="border border-slate-300 px-3 py-2">{a.unit || 'Demirbaş'}</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono">{a.assignedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Official Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs mt-6 pt-4">
            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">TAŞINIR KAYIT YETKİLİSİ</div>
              <div className="text-slate-600 mt-1">Mali Hizmetler Müdürlüğü</div>
              <div className="text-[10px] text-slate-400 mt-1">İmza / Mühür</div>
              <div className="h-12"></div>
            </div>

            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">İNSAN KAYNAKLARI YETKİLİSİ</div>
              <div className="text-slate-600 mt-1">Özlük ve Sicil Birimi</div>
              <div className="text-[10px] text-slate-400 mt-1">İmza / Mühür</div>
              <div className="h-12"></div>
            </div>

            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">İLGİLİ PERSONEL</div>
              <div className="text-slate-600 mt-1">{personnel.firstName} {personnel.lastName}</div>
              <div className="text-[10px] text-slate-400 mt-1">İmza</div>
              <div className="h-12"></div>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-[9px] text-slate-500 text-center italic mt-4 border-t border-slate-100 pt-2">
            * Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir.
          </div>
        </div>
      </div>
    </div>
  );
};
