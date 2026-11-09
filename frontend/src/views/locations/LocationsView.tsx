import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  DoorClosed,
  Layers,
  MapPin,
  Users,
  Search,
} from 'lucide-react';
import { hierarchyService } from '../../services/hierarchyService';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { Building, Room } from '../../types/hierarchy';
import { Asset } from '../../types/asset';

export const LocationsView: React.FC = () => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // 1. Binalar query
  const { data: buildings = [], isLoading: isLoadingBuildings } = useQuery<Building[]>({
    queryKey: ['buildings'],
    queryFn: hierarchyService.getBuildings,
  });

  // Default to first building if none selected
  const activeBuildingId = selectedBuildingId ?? (buildings.length > 0 ? buildings[0].id : null);
  const activeBuilding = buildings.find((b) => b.id === activeBuildingId);

  // 2. Odalar query for active building
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ['rooms', activeBuildingId, roomTypeFilter],
    queryFn: () =>
      hierarchyService.getRooms({
        buildingId: activeBuildingId ?? undefined,
        roomType: roomTypeFilter || undefined,
      }),
    enabled: activeBuildingId != null,
  });

  // 3. Selected room details & assets
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

  // Filter rooms by search query
  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.departmentName && r.departmentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.responsiblePerson && r.responsiblePerson.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Binalar, Katlar ve Odalar
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gebze Belediyesi fiziki yerleşkeleri, kat planları, oda ve ambar demirbaş envanteri
        </p>
      </div>

      {/* 12 Yerleşke / Bina Seçim Hapları */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {isLoadingBuildings ? (
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          buildings.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setSelectedBuildingId(b.id);
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                b.id === activeBuildingId
                  ? 'bg-gebze-navy text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{b.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  b.id === activeBuildingId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {b.assetCount}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Seçili Bina Özet Banner'ı */}
      {activeBuilding && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-50 text-gebze-navy rounded-xl border border-blue-100">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{activeBuilding.name}</h2>
                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
                  {activeBuilding.buildingType}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activeBuilding.address || 'Adres bilgisi girilmemiş'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Toplam Kat</span>
              <span className="font-bold text-slate-900 text-sm">{activeBuilding.totalFloors} Kat</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Oda / Ambar</span>
              <span className="font-bold text-slate-900 text-sm">{activeBuilding.roomCount} Oda</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Demirbaş Sayısı</span>
              <span className="font-bold text-gebze-navy text-sm">{activeBuilding.assetCount} Varlık</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtre ve Arama Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
          >
            <option value="">Tüm Oda Türleri</option>
            <option value="Çalışma Ofisi">Çalışma Ofisi</option>
            <option value="Müdür Odası">Müdür Odası</option>
            <option value="Toplantı Salonu">Toplantı Salonu</option>
            <option value="Sistem Odası">Sistem Odası</option>
            <option value="Depo / Ambar">Depo / Ambar</option>
            <option value="Arşiv">Arşiv</option>
            <option value="Atölye">Atölye</option>
            <option value="Laboratuvar">Laboratuvar</option>
          </select>
          <span className="text-xs text-slate-500">
            {filteredRooms.length} oda listeleniyor
          </span>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Oda no, isim, müdürlük veya personel ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
            />
          </div>
        </div>
      </div>

      {/* Oda Kartları Grid'i */}
      {isLoadingRooms ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <DoorClosed className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h3 className="font-semibold text-slate-700">Oda Bulunamadı</h3>
          <p className="text-xs text-slate-400 mt-1">
            Seçilen binada aradığınız kriterlere uygun tanımlı oda bulunamadı.
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-340px)] min-h-[420px] overflow-y-auto p-1 pr-2 rounded-xl scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-navy-800 p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    Oda {room.roomNumber}
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {room.roomType}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-gebze-navy transition-colors line-clamp-1">
                  {room.name}
                </h3>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{room.floorName || 'Kat Bilgisi Yok'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{room.departmentName || 'Genel Kullanım'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{room.responsiblePerson || 'Sorumlu Atanmamış'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">👥 Kapasite: {room.capacity || 4}</span>
                <span className="font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded">
                  {room.assetCount} Demirbaş
                </span>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Oda Detay Modalı */}
      <Modal
        isOpen={selectedRoomId != null}
        onClose={() => setSelectedRoomId(null)}
        title={selectedRoom ? `Oda ${selectedRoom.roomNumber} — ${selectedRoom.name}` : 'Oda Detayı'}
        subtitle={selectedRoom ? `${selectedRoom.buildingName || ''} > ${selectedRoom.floorName || ''}` : ''}
        maxWidth="2xl"
      >
        {selectedRoom && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Oda Türü</span>
                <span className="font-semibold text-slate-800">{selectedRoom.roomType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Bağlı Müdürlük</span>
                <span className="font-semibold text-slate-800">{selectedRoom.departmentName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Sorumlu Personel</span>
                <span className="font-semibold text-slate-800">{selectedRoom.responsiblePerson || 'Atanmamış'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kapasite</span>
                <span className="font-semibold text-slate-800">{selectedRoom.capacity || 4} Kişi</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">QR Kod</span>
                <span className="font-mono font-semibold text-slate-800">{selectedRoom.qrCode || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Demirbaş Sayısı</span>
                <span className="font-bold text-gebze-navy">{selectedRoom.assetCount || roomAssets.length}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Bu Odada Bulunan Demirbaşlar ({roomAssets.length})
              </h4>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Kod</th>
                      <th className="py-2 px-3">Demirbaş Adı</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3">Zimmetli</th>
                      <th className="py-2 px-3 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {roomAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Bu odada kayıtlı demirbaş bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      roomAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">{asset.code}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{asset.name}</td>
                          <td className="py-2 px-3 text-slate-500">{asset.category || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{asset.assignee || 'Depoda'}</td>
                          <td className="py-2 px-3 text-right">
                            <StatusBadge status={asset.status} />
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
