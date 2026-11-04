import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { bulkImportService } from '../../services/bulkImportService';
import {
  BulkImportValidationResult,
} from '../../types/bulkImport';
import { formatCurrency } from '../../components/common/formatters';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<BulkImportValidationResult | null>(null);
  const [partialImportAllowed, setPartialImportAllowed] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      await bulkImportService.downloadTemplate();
      showToast('Excel içe aktarım şablonu indirildi.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Şablon indirilemedi.';
      showToast(msg, 'warning');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.xlsx')) {
        showToast('Lütfen yalnızca .xlsx uzantılı Excel dosyası seçin.', 'warning');
        return;
      }
      setSelectedFile(file);
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      showToast('Lütfen önce bir .xlsx dosyası seçin.', 'warning');
      return;
    }

    setIsValidating(true);
    try {
      const result = await bulkImportService.validate(selectedFile);
      setValidationResult(result);
      if (result.invalidRowsCount > 0) {
        showToast(`Doğrulama tamamlandı: ${result.invalidRowsCount} satırda hata tespit edildi.`, 'warning');
      } else {
        showToast(`Tüm ${result.validRowsCount} satır başarıyla doğrulandı.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dosya ön doğrulaması başarısız oldu.';
      showToast(msg, 'warning');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedFile || !validationResult) return;

    if (validationResult.invalidRowsCount > 0 && !partialImportAllowed) {
      showToast('Hatalı satırlar varken içe aktarım yapılamaz. Lütfen kısmi aktarımı onaylayın veya dosyayı düzeltin.', 'warning');
      return;
    }

    setIsCommitting(true);
    try {
      const result = await bulkImportService.commit(selectedFile, partialImportAllowed);
      showToast(`Başarılı: ${result.importedCount} adet varlık içe aktarıldı (Parti No: ${result.batchId})`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İçe aktarım kaydı tamamlanamadı.';
      showToast(msg, 'warning');
    } finally {
      setIsCommitting(false);
    }
  };

  const canCommit =
    validationResult &&
    validationResult.validRowsCount > 0 &&
    (validationResult.invalidRowsCount === 0 || partialImportAllowed);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excel ile Toplu Varlık İçe Aktarımı (Bulk Import)"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step 1: Template Download */}
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-blue-900">1. Adım: Standart Excel Şablonunu İndirin</div>
              <div className="text-xs text-blue-700 mt-0.5">
                Yetkili müdürlük, kategori ve oda kodlarını içeren güncel doğrulama listeleri şablona dahildir.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            id="btn-download-import-template"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg shadow-sm transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Şablonu İndir (.xlsx)
          </button>
        </div>

        {/* Step 2: File Select and Validate */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="text-xs font-bold text-slate-800">
            2. Adım: Doldurulan Excel Dosyasını Seçin ve Ön Doğrulama Yapın
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="file"
              id="bulk-import-file-input"
              accept=".xlsx"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1 bg-white"
            />

            <button
              type="button"
              id="btn-validate-import"
              onClick={handleValidate}
              disabled={!selectedFile || isValidating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm disabled:opacity-50 flex-shrink-0"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  Ön Doğrulama Yap
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 3: Validation Summary & Details */}
        {validationResult && (
          <div className="space-y-4">
            {/* Summary KPI Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Toplam Satır</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{validationResult.totalRows}</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-sm">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Geçerli Satır
                </div>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">
                  {validationResult.validRowsCount}
                </div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center shadow-sm">
                <div className="text-[11px] font-semibold text-rose-700 uppercase flex items-center justify-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Hatalı Satır
                </div>
                <div className="text-lg font-bold text-rose-800 mt-0.5">
                  {validationResult.invalidRowsCount}
                </div>
              </div>
            </div>

            {/* Errors Table */}
            {validationResult.invalidRowsCount > 0 && (
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Tespit Edilen Satır Hataları
                </div>

                <div className="max-h-48 overflow-y-auto border border-rose-200 rounded-lg bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-100/60 text-rose-900 font-semibold border-b border-rose-200">
                      <tr>
                        <th className="px-3 py-2 w-16">Satır</th>
                        <th className="px-3 py-2 w-28">Hatalı Alan</th>
                        <th className="px-3 py-2 w-28">Girilen Değer</th>
                        <th className="px-3 py-2">Hata Açıklaması</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 text-slate-700">
                      {validationResult.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/50">
                          <td className="px-3 py-1.5 font-mono font-bold text-rose-700">#{err.rowNumber}</td>
                          <td className="px-3 py-1.5 font-semibold">{err.field}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-500 truncate max-w-[120px]">
                            {err.value || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-rose-700">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Partial import checkbox */}
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    id="chk-partial-import"
                    checked={partialImportAllowed}
                    onChange={(e) => setPartialImportAllowed(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    Hatalı satırları atlayarak sadece <strong>{validationResult.validRowsCount}</strong> geçerli kaydı sisteme aktar (Kısmi İçe Aktarım)
                  </span>
                </label>
              </div>
            )}

            {/* Valid Rows Preview */}
            {validationResult.validRowsCount > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">
                  Aktarılacak Kayıtlar Önizlemesi (İlk {Math.min(validationResult.validRows.length, 5)} kayıt)
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-1.5">Kod</th>
                        <th className="px-3 py-1.5">Varlık Adı</th>
                        <th className="px-3 py-1.5">Kategori</th>
                        <th className="px-3 py-1.5">Müdürlük</th>
                        <th className="px-3 py-1.5 text-right">Tahmini Değer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {validationResult.validRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-mono font-semibold text-blue-700">{row.code}</td>
                          <td className="px-3 py-1.5 font-medium">{row.name}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.categoryCode}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.departmentCode}</td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {formatCurrency(row.estimatedValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Vazgeç
          </button>
          <button
            type="button"
            id="btn-commit-import"
            data-action="commit-import"
            onClick={handleCommit}
            disabled={!canCommit || isCommitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            {isCommitting ? 'İçe Aktarılıyor...' : 'İçe Aktarımı Tamamla (Commit)'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
