export interface DepreciationReportItem {
  assetId: number;
  assetCode: string;
  assetName: string;
  category: string;
  departmentName: string;
  acquisitionDate: string;
  originalValue: number;
  usefulLifeYears: number;
  annualDepreciationRate: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  status: string;
}
