import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Building2,
  Users,
  DoorClosed,
  CheckCircle2,
  Archive,
  Wrench,
  Coins,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { hierarchyService } from '../../services/hierarchyService';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDateTime } from '../../components/common/formatters';
import { Room } from '../../types/hierarchy';
import { Asset } from '../../types/asset';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getSummary,
  });

  // Query for room details when modal is open
  const { data: selectedRoom } = useQuery<Room>({
    queryKey: ['room', selectedRoomId],
    queryFn: () => hierarchyService.getRoomById(selectedRoomId!),
    enabled: selectedRoomId != null,
  });

  const { data: roomAssets = [] } = useQuery<Asset[]>({
    queryKey: ['room-assets', selectedRoomId],
    queryFn: () => hierarchyService.getAssetsInRoom(selectedRoomId!),
    enabled: selectedRoomId != null,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-700">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <h3 className="font-bold">Gösterge Paneli Yüklenemedi</h3>
        <p className="text-sm mt-1">{(error as Error)?.message || 'Sunucu ile iletişim kurulamadı.'}</p>
      </div>
    );
  }

  const filteredDepts = (dashboard.unitSummaries || []).filter((d) =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearch.toLowerCase()) ||
    (d.managerName && d.managerName.toLowerCase().includes(deptSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Sayfa Başlığı */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Yönetici Gösterge Paneli
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          T.C. Gebze Belediyesi Kurumsal Varlık, Yerleşke ve Taşınır Envanteri Gerçek Zamanlı Özeti
        </p>
      </div>

      {/* 8 Temel KPI Kartı */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Varlık"
          value={dashboard.totalAssets}
          subtitle="Kayıtlı Taşınır & Demirbaş"
          color="blue"
          icon={<Package className="w-6 h-6" />}
        />
        <StatCard
          title="Aktif & Zimmetli"
          value={dashboard.activeCount}
          subtitle="Personel ve Hizmette"
          color="emerald"
          icon={<CheckCircle2 className="w-6 h-6" />}
        />
        <StatCard
          title="Depoda Bekleyen"
          value={dashboard.inStorageCount}
          subtitle="Tahsis Edilebilir"
          color="indigo"
          icon={<Archive className="w-6 h-6" />}
        />
        <StatCard
          title="Bakım ve Onarım"
          value={dashboard.maintenanceCount}
          subtitle="İş Emri Açık Varlıklar"
          color="amber"
          icon={<Wrench className="w-6 h-6" />}
        />
        <StatCard
          title="Toplam Yerleşke"
          value={dashboard.totalBuildings}
          subtitle="Hizmet Binası & Tesis"
          color="slate"
          icon={<Building2 className="w-6 h-6" />}
        />
        <StatCard
          title="Müdürlük Sayısı"
          value={dashboard.totalDepartments}
          subtitle="30 Kurumsal Birim"
          color="blue"
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="Toplam Oda / Alan"
          value={dashboard.totalRooms}
          subtitle="Barkodlu / QR Tanımlı"
          color="slate"
          icon={<DoorClosed className="w-6 h-6" />}
        />
        <StatCard
          title="Tahmini Envanter Değeri"
          value={formatCurrency(dashboard.totalEstimatedValue)}
          subtitle="Kayıtlı Toplam Defter Tutarı"
          color="emerald"
          icon={<Coins className="w-6 h-6" />}
        />
      </div>

      {/* Akıllı Sistem Uyarıları (Varsa) */}
      {((dashboard.warrantyAlerts && dashboard.warrantyAlerts.length > 0) ||
        (dashboard.conditionAlerts && dashboard.conditionAlerts.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboard.warrantyAlerts && dashboard.warrantyAlerts.length > 0 && (
            <Card
              title="Garanti Süresi Yaklaşanlar"
              subtitle="Önümüzdeki 90 gün içinde garantisi dolacak demirbaşlar"
              className="border-amber-200 bg-amber-50/30"
            >
              <div className="divide-y divide-amber-100">
                {dashboard.warrantyAlerts.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="ml-2 font-mono text-slate-500">[{item.code}]</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{item.unit} &bull; {item.location}</p>
                    </div>
                    <span className="font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      {item.warrantyEndDate}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {dashboard.conditionAlerts && dashboard.conditionAlerts.length > 0 && (
            <Card
              title="Onarım Bekleyen Varlıklar"
              subtitle="Durumu onarım gerekli veya yıpranmış olarak işaretlenmiş demirbaşlar"
              className="border-rose-200 bg-rose-50/30"
            >
              <div className="divide-y divide-rose-100">
                {dashboard.conditionAlerts.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="ml-2 font-mono text-slate-500">[{item.code}]</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{item.unit} &bull; {item.location}</p>
                    </div>
                    <span className="font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      {item.condition}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 30 Kurumsal Müdürlük Özeti */}
      <Card
        title="30 Kurumsal Müdürlük Varlık Dağılımı"
        subtitle="Müdürlük bazında toplam, aktif, depodaki ve bakımdaki varlık sayıları"
        action={
          <div className="w-64">
            <SearchInput
              value={deptSearch}
              onChange={setDeptSearch}
              placeholder="Müdürlük ara..."
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kod</th>
                <th className="py-3 px-4">Müdürlük Adı</th>
                <th className="py-3 px-4">Birim Yöneticisi</th>
                <th className="py-3 px-3 text-center">Toplam</th>
                <th className="py-3 px-3 text-center">Aktif</th>
                <th className="py-3 px-3 text-center">Depoda</th>
                <th className="py-3 px-3 text-center">Bakımda</th>
                <th className="py-3 px-4 text-right">Toplam Değer</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Aramanızla eşleşen müdürlük bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredDepts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gebze-navy">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{d.code}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {d.managerName || <span className="text-slate-400 italic">Müdür Atanmamış</span>}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{d.totalCount}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block min-w-6 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
                        {d.activeCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block min-w-6 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200">
                        {d.storageCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block min-w-6 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-xs border border-amber-200">
                        {d.maintenanceCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(d.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/departments?highlight=${d.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gebze-navy hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                      >
                        İncele
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* İki Kolonlu Alt Bölüm: Binalar Dağılımı & En Çok Varlık Bulunan Odalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 12 Bina Dağılımı */}
        <Card
          title="Hizmet Binaları ve Tesis Dağılımı"
          subtitle="Belediye ana hizmet binaları, ek hizmet birimleri ve şantiyeler"
          action={
            <button
              type="button"
              onClick={() => navigate('/locations')}
              className="text-xs font-semibold text-gebze-navy hover:underline flex items-center gap-1"
            >
              Tüm Odaları Gör <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Bina Adı</th>
                  <th className="py-2.5 px-3">Tür</th>
                  <th className="py-2.5 px-3 text-right">Oda Sayısı</th>
                  <th className="py-2.5 px-3 text-right">Demirbaş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {(dashboard.buildingsDistribution || []).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{b.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{b.type}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{b.roomCount}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gebze-navy">{b.assetCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* En Çok Varlık Bulunan Odalar */}
        <Card
          title="En Çok Demirbaş Bulunan Odalar"
          subtitle="Oda detaylarını ve içindeki demirbaşları görmek için tıklayın"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Oda / Birim</th>
                  <th className="py-2.5 px-3">Bina</th>
                  <th className="py-2.5 px-3">Tür</th>
                  <th className="py-2.5 px-3 text-right">Demirbaş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {(dashboard.topRooms || []).map((r) => (
                  <tr
                    key={r.roomId}
                    onClick={() => setSelectedRoomId(r.roomId)}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900">Oda {r.roomNumber}</span>
                      <span className="text-slate-500 ml-1.5">&mdash; {r.roomName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.buildingName}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600">
                        {r.roomType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded">
                        {r.assetCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 16 Kategori Grid */}
      <Card
        title="16 Ana Varlık Kategorisi"
        subtitle="Belediye demirbaş envanterinin kategorik dağılımı"
        action={
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="text-xs font-semibold text-gebze-navy hover:underline flex items-center gap-1"
          >
            Tüm Kategoriler <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {(dashboard.byCategory || []).map((c, i) => (
            <div
              key={i}
              onClick={() => navigate(`/categories?category=${encodeURIComponent(c.name)}`)}
              className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-200 cursor-pointer transition-all text-center group"
            >
              <div className="w-8 h-8 mx-auto rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                🏷️
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-2 truncate" title={c.name}>
                {c.name}
              </p>
              <p className="text-[11px] font-bold text-gebze-navy mt-0.5">
                {c.count} demirbaş
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Son Varlık Hareketleri */}
      <Card
        title="Son Varlık Hareketleri ve Transferler"
        subtitle="Zimmet, bakım, yerleşke transferi ve durum değişikliklerinin son akışı"
        action={
          <button
            type="button"
            onClick={() => navigate('/movements')}
            className="text-xs font-semibold text-gebze-navy hover:underline flex items-center gap-1"
          >
            Tüm Hareketler <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Tarih</th>
                <th className="py-2.5 px-4">Demirbaş</th>
                <th className="py-2.5 px-4">İşlem Türü</th>
                <th className="py-2.5 px-4">Hareket Yönü</th>
                <th className="py-2.5 px-4">İşlemi Yapan</th>
                <th className="py-2.5 px-4">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {(dashboard.recentMovements || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Henüz kayıtlı hareket bulunmuyor.
                  </td>
                </tr>
              ) : (
                dashboard.recentMovements.slice(0, 8).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.timestamp)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-gebze-navy font-semibold">{m.assetCode}</span>
                      <p className="text-slate-600 font-medium">{m.assetName}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={m.typeLabel || m.type} />
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-slate-500">{m.fromLocation || 'Depo / Başlangıç'}</span>
                      <span className="mx-1 text-slate-400">&rarr;</span>
                      <span className="font-semibold text-slate-800">{m.toLocation}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{m.performedBy}</td>
                    <td className="py-2.5 px-4 text-slate-500 italic max-w-xs truncate">
                      {m.note || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Oda Detay Modalı (En Çok Demirbaş Bulunan Odadan veya Tıklanan Odadan Açılır) */}
      <Modal
        isOpen={selectedRoomId != null}
        onClose={() => setSelectedRoomId(null)}
        title={selectedRoom ? `Oda ${selectedRoom.roomNumber} — ${selectedRoom.name}` : 'Oda Detayları'}
        subtitle={selectedRoom ? `${selectedRoom.buildingName || ''} > ${selectedRoom.floorName || ''}` : ''}
        maxWidth="2xl"
      >
        {selectedRoom && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-slate-500">Oda Türü:</span>
                <p className="font-semibold text-slate-800">{selectedRoom.roomType}</p>
              </div>
              <div>
                <span className="text-slate-500">Müdürlük:</span>
                <p className="font-semibold text-slate-800">{selectedRoom.departmentName || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Sorumlu Personel:</span>
                <p className="font-semibold text-slate-800">{selectedRoom.responsiblePerson || 'Atanmamış'}</p>
              </div>
              <div>
                <span className="text-slate-500">Kapasite:</span>
                <p className="font-semibold text-slate-800">{selectedRoom.capacity || 4} Kişi</p>
              </div>
              <div>
                <span className="text-slate-500">QR Kod:</span>
                <p className="font-mono font-semibold text-slate-800">{selectedRoom.qrCode || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Varlık Sayısı:</span>
                <p className="font-bold text-gebze-navy">{selectedRoom.assetCount || roomAssets.length}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Bu Odada Bulunan Demirbaşlar ({roomAssets.length})
              </h4>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Kod</th>
                      <th className="py-2 px-3">Varlık Adı</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3">Zimmetli</th>
                      <th className="py-2 px-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {roomAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">
                          Bu odada kayıtlı demirbaş bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      roomAssets.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">{a.code}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{a.name}</td>
                          <td className="py-2 px-3 text-slate-500">{a.category || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{a.assignee || 'Depoda'}</td>
                          <td className="py-2 px-3">
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
