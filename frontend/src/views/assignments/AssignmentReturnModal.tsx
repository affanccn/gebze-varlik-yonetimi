import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { assignmentService } from '../../services/assignmentService';
import { AssetAssignment } from '../../types/assignment';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface AssignmentReturnModalProps {
  assignment: AssetAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignmentReturnModal: React.FC<AssignmentReturnModalProps> = ({
  assignment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [returnLocation, setReturnLocation] = useState('Merkez Taşınır Ana Ambarı');
  const [returnNote, setReturnNote] = useState('Depo yetkilisi tarafından eksiksiz teslim alındı.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await assignmentService.returnAssignment(assignment.id, {
        targetStatus: 'BOSTA',
        returnLocation,
        returnNote,
      });
      showToast(`${assignment.documentNo} numaralı zimmet başarıyla iade alındı.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Zimmet iade işlemi başarısız oldu.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Zimmet İade Kabul İşlemi"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {assignment.documentNo}
            </span>
            <span className="text-slate-500 font-medium">Zimmet Tarihi: {assignment.assignedAt}</span>
          </div>
          <div className="text-sm font-bold text-slate-800">
            {assignment.assetCode} — {assignment.assetName}
          </div>
          <div className="text-xs text-slate-600">
            <strong>Teslim Eden Personel:</strong> {assignment.assigneeName} {assignment.assigneeTitle ? `(${assignment.assigneeTitle})` : ''}
          </div>
          {assignment.unit && (
            <div className="text-xs text-slate-500">
              <strong>Birim / Yer:</strong> {assignment.unit} {assignment.location ? `• ${assignment.location}` : ''}
            </div>
          )}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            Bu işlem onaylandığında demirbaşın zimmet durumu sona erecek ve varlık ana depoya (BOŞTA) çekilecektir.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            İade Alınan Ambar / Konum
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={returnLocation}
            onChange={(e) => setReturnLocation(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Teslim ve Muayene Notu
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="Demirbaşın fiziki durumu ve teslim detayları..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isSubmitting ? 'İade Alınıyor...' : 'Zimmeti İade Al'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

