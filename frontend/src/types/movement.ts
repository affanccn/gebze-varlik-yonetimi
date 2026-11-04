export interface AssetMovement {
  id: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  type: string;
  typeLabel: string;
  fromUnit?: string;
  fromLocation?: string;
  toUnit?: string;
  toLocation?: string;
  performedBy: string;
  note?: string;
  timestamp: string;
}
