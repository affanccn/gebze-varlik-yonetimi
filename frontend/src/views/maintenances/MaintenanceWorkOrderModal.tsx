import React from 'react';
import { Modal } from '../../components/common/Modal';
import { MaintenanceWorkOrder } from '../../types/maintenance';
import { QRCodeSvg } from '../../components/common/QRCodeSvg';
import { Printer, Wrench, Building2, CheckCircle2 } from 'lucide-react';

interface MaintenanceWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: MaintenanceWorkOrder | null;
  isLoading?: boolean;
}

export const MaintenanceWorkOrderModal: React.FC<MaintenanceWorkOrderModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  isLoading,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={workOrder ? `İş Emri Formu - ${workOrder.orderNo}` : 'İş Emri Formu'}
      maxWidth="4xl"
    >
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">İş emri verileri hazırlanıyor...</div>
      ) : !workOrder ? (
        <div className="p-8 text-center text-rose-500">İş emri bilgisi bulunamadı.</div>
      ) : (
        <div className="space-y-6">
          {/* Yazdır Butonu (Ekranda görünür, baskıda print modunda otomatik stil alır) */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 print:hidden">
            <span className="text-xs text-slate-600">
              Resmi A4 formatında iş emri ve sevk fişi çıktısı almak için yazdır butonunu kullanabilirsiniz.
            </span>
            <button
              type="button"
              id="btn-print-work-order"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Kaydet
            </button>
          </div>

          {/* RESMİ İŞ EMRİ FORMU (Baskı Alanı) */}
          <div
            id="work-order-print-area"
            className="p-6 bg-white border-2 border-slate-800 rounded-lg space-y-5 text-slate-900 font-sans"
          >
            {/* Form Başlığı ve Logo */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div className="text-center flex-1">
                <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900">
                  {workOrder.municipalHeader || 'T.C. GEBZE BELEDİYE BAŞKANLIĞI'}
                </h2>
                <h3 className="text-xs font-semibold text-slate-700 mt-0.5">
                  {workOrder.workUnit || 'Destek Hizmetleri Müdürlüğü - Makine İkmal Bakım Onarım Şefliği'}
                </h3>
                <h1 className="text-base font-extrabold text-slate-950 mt-1 uppercase tracking-tight underline">
                  TAŞINIR MAL BAKIM & ONARIM İŞ EMRİ FORMU
                </h1>
              </div>
              <div className="w-20 text-center shrink-0">
                <QRCodeSvg value={workOrder.assetCode} size={64} className="mx-auto" />
                <span className="text-[9px] font-mono font-bold block mt-1">{workOrder.assetCode}</span>
              </div>
            </div>

            {/* İş Emri Künyesi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-300 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">İş Emri No</span>
                <strong className="font-mono text-sm text-blue-900">{workOrder.orderNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Tarih / Saat</span>
                <span className="font-medium text-slate-800">{workOrder.startedAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Öncelik Seviyesi</span>
                <span className="font-bold text-slate-900">{workOrder.priority}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Durum</span>
                <span className="font-bold text-emerald-800">{workOrder.status}</span>
              </div>
            </div>

            {/* Arızalı Demirbaş Varlık Bilgileri */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-300 pb-1 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                1. Demirbaş Varlık Bilgileri
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Demirbaş Adı:</span>
                  <strong className="text-slate-900">{workOrder.assetName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Varlık Kodu:</span>
                  <span className="font-mono font-bold text-slate-900">{workOrder.assetCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Barkod No:</span>
                  <span className="font-mono text-slate-700">{workOrder.barcode || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Kategori:</span>
                  <span className="text-slate-800">{workOrder.categoryName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Bağlı Müdürlük:</span>
                  <span className="text-slate-800">{workOrder.departmentName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Bulunduğu Mahalli:</span>
                  <span className="text-slate-800">
                    {workOrder.roomNumber ? `Oda ${workOrder.roomNumber} (${workOrder.location})` : workOrder.location || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Arıza Bildirimi ve Görevli Teknisyen */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-300 pb-1 mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-600" />
                2. Arıza Bildirimi & Görevlendirilen Teknisyen
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                    Arıza / Talep Açıklaması:
                  </span>
                  <p className="text-slate-900 mt-0.5 whitespace-pre-wrap">{workOrder.issueDescription}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Görevlendirilen Teknisyen / Servis:</span>
                    <strong className="text-slate-900 text-sm">{workOrder.technicianName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tahmini / Gerçekleşen Maliyet:</span>
                    <strong className="text-slate-900 text-sm">
                      {workOrder.finalCost != null
                        ? `${workOrder.finalCost.toLocaleString('tr-TR')} ₺`
                        : workOrder.estimatedCost != null
                        ? `${workOrder.estimatedCost.toLocaleString('tr-TR')} ₺ (Tahmini)`
                        : 'Maliyet Belirtilmedi'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Yapılan İşlemler ve Çözüm */}
            {workOrder.resolutionNote && (
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-300 pb-1 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  3. Yapılan Bakım & Onarım İşlemleri
                </h4>
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded text-xs text-slate-900">
                  <p className="whitespace-pre-wrap">{workOrder.resolutionNote}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Tamamlanma Zamanı: {workOrder.completedAt || '—'}
                  </span>
                </div>
              </div>
            )}

            {/* İmza ve Onay Blokları */}
            <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-center text-xs">
              <div className="space-y-8">
                <span className="text-[11px] font-bold block uppercase text-slate-700">Teslim Eden (Birim Yetkilisi)</span>
                <div className="border-b border-slate-400 mx-4" />
                <span className="text-[10px] text-slate-500 block">İmza / Kaşe</span>
              </div>
              <div className="space-y-8">
                <span className="text-[11px] font-bold block uppercase text-slate-700">Görevli Teknisyen</span>
                <div className="border-b border-slate-400 mx-4" />
                <span className="text-[10px] text-slate-800 font-semibold block">{workOrder.technicianName}</span>
              </div>
              <div className="space-y-8">
                <span className="text-[11px] font-bold block uppercase text-slate-700">Onaylayan (Taşınır Yetkilisi)</span>
                <div className="border-b border-slate-400 mx-4" />
                <span className="text-[10px] text-slate-500 block">İmza / Mühür</span>
              </div>
            </div>

            {/* Dipnot */}
            <div className="text-[9px] text-slate-400 text-center pt-2 border-t border-slate-200">
              Bu belge 5018 sayılı Kamu Malî Yönetimi ve Kontrol Kanunu uyarınca düzenlenmiştir. Yazdırılma: {workOrder.printedAt}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
