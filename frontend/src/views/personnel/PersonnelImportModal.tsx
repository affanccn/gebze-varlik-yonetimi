import React, { useState } from 'react';
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { personnelService } from '../../services/personnelService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  PersonnelImportValidationResult,
  PersonnelImportCommitResult,
} from '../../types/personnel';

interface PersonnelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PersonnelImportModal: React.FC<PersonnelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<PersonnelImportValidationResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    setIsValidating(true);
    try {
      const res = await personnelService.validateImport(selectedFile);
      setValidationResult(res);
      if (res.errorRows > 0) {
        showToast(`Doğrulama tamamlandı: ${res.errorRows} satırda hata tespit edildi.`, 'warning');
      } else {
        showToast(`Doğrulama başarılı: ${res.validRows} personel aktarıma hazır.`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Doğrulama sırasında hata oluştu.';
      showToast(msg, 'warning');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    setIsCommitting(true);
    try {
      const res: PersonnelImportCommitResult = await personnelService.commitImport(selectedFile);
      showToast(
        `Toplu personel aktarımı tamamlandı: ${res.insertedCount} yeni eklendi, ${res.updatedCount} güncellendi.`,
        'success'
      );
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İçe aktarım sırasında hata oluştu.';
      showToast(msg, 'warning');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setValidationResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Excel ile Toplu Personel Yükleme"
      subtitle="Gebze Belediyesi personel kadro listesini Excel üzerinden toplu içe aktarın"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Şablon İndirme Alanı */}
        <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-blue-900">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold">Resmi Personel Yükleme Şablonu</p>
              <p className="text-blue-700/80 text-[11px] mt-0.5">
                Sicil no, unvan, müdürlük kodları ve oda bilgisi içeren Excel formatı
              </p>
            </div>
          </div>
          <a
            href={personnelService.exportTemplateUrl()}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Şablonu İndir
          </a>
        </div>

        {/* Dosya Seçim Alanı */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-gebze-navy/40 transition-colors bg-slate-50/50">
          <input
            type="file"
            id="personnel-excel-upload"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="personnel-excel-upload" className="cursor-pointer space-y-2 block">
            <div className="w-10 h-10 mx-auto rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500">
              <Upload className="w-5 h-5 text-gebze-navy" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-gebze-navy">Excel dosyası seçin</span>
              <span className="text-slate-500"> veya buraya sürükleyin</span>
            </div>
            <p className="text-[11px] text-slate-400">Yalnızca .xlsx formatı desteklenir</p>
          </label>
          {selectedFile && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Doğrulama Sonuçları */}
        {validationResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 text-[11px]">Toplam Satır</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{validationResult.totalRows}</p>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-emerald-700 text-[11px]">Geçerli Personel</span>
                <p className="font-bold text-emerald-800 text-sm mt-0.5">{validationResult.validRows}</p>
              </div>
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-rose-700 text-[11px]">Hatalı Satır</span>
                <p className="font-bold text-rose-800 text-sm mt-0.5">{validationResult.errorRows}</p>
              </div>
            </div>

            {/* Hata Listesi */}
            {validationResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 max-h-36 overflow-y-auto space-y-1">
                <div className="font-bold flex items-center gap-1 text-rose-900 mb-1">
                  <AlertCircle className="w-4 h-4" /> Düzeltilmesi Gereken Hatalar:
                </div>
                {validationResult.errors.map((err, i) => (
                  <div key={i} className="text-[11px]">
                    &bull; Satır {err.rowNumber} [{err.columnName}]: {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Önizleme Tablosu */}
            {validationResult.previewRows.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Önizleme ({validationResult.previewRows.length} personel):
                </p>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2.5">Sicil No</th>
                        <th className="py-1.5 px-2.5">Ad Soyad</th>
                        <th className="py-1.5 px-2.5">Unvan</th>
                        <th className="py-1.5 px-2.5">Müdürlük</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.previewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-gebze-navy">{r.registrationNumber}</td>
                          <td className="py-1.5 px-2.5 font-medium">{r.firstName} {r.lastName}</td>
                          <td className="py-1.5 px-2.5 text-slate-600">{r.title}</td>
                          <td className="py-1.5 px-2.5 text-slate-600">{r.departmentCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Eylem Butonları */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Kapat
          </button>
          {!validationResult ? (
            <button
              type="button"
              onClick={handleValidate}
              disabled={!selectedFile || isValidating}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              {isValidating ? 'Doğrulanıyor...' : 'Dosyayı İncele (Doğrula)'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCommit}
              disabled={validationResult.errorRows > 0 || isCommitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCommitting ? 'Sisteme Aktarılıyor...' : 'Onayla ve Personelleri Aktar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

