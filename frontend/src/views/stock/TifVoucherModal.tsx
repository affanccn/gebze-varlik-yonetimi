import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { StockTransaction } from '../../types/stock';

interface TifVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StockTransaction | null;
}

export const TifVoucherModal: React.FC<TifVoucherModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const tifNo = `TİF-2026-${String(transaction.id).padStart(6, '0')}`;
  const currentDate = transaction.txDate || new Date().toLocaleDateString('tr-TR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - Not printed */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Taşınır İşlem Fişi (TİF) Önizleme</h2>
              <p className="text-xs text-slate-500">Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
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

        {/* Printable Voucher Body */}
        <div className="p-8 overflow-y-auto bg-white font-sans text-slate-800 print:p-0 print:m-0" id="tif-print-area">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-sm font-extrabold tracking-wider text-slate-900 uppercase">T.C. GEBZE BELEDİYESİ</div>
            <div className="text-xs font-semibold text-slate-600 uppercase mt-0.5">MALİ HİZMETLER MÜDÜRLÜĞÜ — TAŞINIR KAYIT VE KONTROL BİRİMİ</div>
            <div className="text-base font-black text-slate-900 mt-2 tracking-wide uppercase">
              TAŞINIR İŞLEM FİŞİ (TİF) — SARF MALZEME ÇIKIŞI
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-400">
            <div>
              <div className="mb-1.5"><strong className="text-slate-700">Fiş Numarası:</strong> <span className="font-mono font-bold text-blue-900">{tifNo}</span></div>
              <div className="mb-1.5"><strong className="text-slate-700">İşlem Tarihi:</strong> {currentDate}</div>
              <div><strong className="text-slate-700">İşlem Türü:</strong> Sarf Malzeme Çıkışı (Tüketim)</div>
            </div>
            <div>
              <div className="mb-1.5"><strong className="text-slate-700">Çıkış Yapılan Birim:</strong> {transaction.departmentName || 'Belirtilmedi'}</div>
              <div className="mb-1.5"><strong className="text-slate-700">Teslim Alan Yetkili:</strong> {transaction.recipientName || 'Birim Sorumlusu'}</div>
              <div><strong className="text-slate-700">Ambar Kayıt Memuru:</strong> {transaction.performedBy || 'Taşınır Yetkilisi'}</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-200">
                <th className="border border-slate-300 px-3 py-2 text-center w-12">S.No</th>
                <th className="border border-slate-300 px-3 py-2 w-32">Malzeme Kodu</th>
                <th className="border border-slate-300 px-3 py-2">Taşınır Malzeme Tanımı</th>
                <th className="border border-slate-300 px-3 py-2 text-center w-24">Miktar</th>
                <th className="border border-slate-300 px-3 py-2 text-center w-20">Birim</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-3 text-center font-mono">1</td>
                <td className="border border-slate-300 px-3 py-3 font-mono font-bold text-slate-900">
                  {`STK-${transaction.stockItemId}`}
                </td>
                <td className="border border-slate-300 px-3 py-3 font-medium text-slate-800">
                  {transaction.itemName || 'Sarf Malzemesi'}
                </td>
                <td className="border border-slate-300 px-3 py-3 text-center font-bold text-blue-900">
                  {transaction.quantity}
                </td>
                <td className="border border-slate-300 px-3 py-3 text-center">
                  {transaction.unit || 'Adet'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          {transaction.notes && (
            <div className="text-xs text-slate-600 mb-8 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong>İşlem Açıklaması:</strong> {transaction.notes}
            </div>
          )}

          {/* Declaration Text */}
          <p className="text-[10px] text-slate-500 leading-relaxed mb-6 text-justify">
            Yukarıda dökümü yapılan sarf malzemeleri kurum içi sarf malzeme prosedürleri ve yönergeleri uyarınca ilgili birimin hizmet ve faaliyetlerinde kullanılmak üzere eksiksiz ve sağlam olarak teslim edilmiş ve teslim alınmıştır.
          </p>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-6 pt-4">
            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">TESLİM EDEN</div>
              <div className="text-slate-600 mt-1">{transaction.performedBy || 'Taşınır Kayıt ve Kontrol Yetkilisi'}</div>
              <div className="text-[10px] text-slate-400 mt-1">İmza / Kaşe</div>
              <div className="h-12"></div>
            </div>

            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">TESLİM ALAN</div>
              <div className="text-slate-600 mt-1">{transaction.recipientName || 'Birim Yetkilisi'}</div>
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
