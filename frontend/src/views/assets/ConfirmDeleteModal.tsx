import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { assetService } from '../../services/assetService';
import { Asset } from '../../types/asset';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: number) => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !asset) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await assetService.delete(asset.id);
      showToast(`'${asset.name}' (${res.code}) varlığı başarıyla silindi ve arşive alındı.`);
      onSuccess(res.deletedId);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Varlık silinirken bir hata oluştu.';
      showToast(message, 'warning');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Varlığı Sil / Arşive Al"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 space-y-1">
            <div className="font-semibold text-rose-900">
              Bu varlık kaydını silmek istediğinize emin misiniz?
            </div>
            <div>
              Varlık sistemden pasife (arşive) alınacak ve aktif listelerden kaldırılacaktır.
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
          <div>
            <strong>Varlık Kodu:</strong> <span className="font-mono text-blue-700">{asset.code}</span>
          </div>
          <div>
            <strong>Varlık Adı:</strong> <span className="text-slate-800 font-medium">{asset.name}</span>
          </div>
          <div>
            <strong>Müdürlük:</strong> {asset.departmentName || asset.unit || '-'}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Siliniyor...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Evet, Varlığı Sil
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
