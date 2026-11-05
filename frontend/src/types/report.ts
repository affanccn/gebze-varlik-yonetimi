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

export interface Form13ReportItem {
  accountCode: string;
  assetCode: string;
  assetName: string;
  category: string;
  departmentName: string;
  location: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: string;
  conditionStatus: string;
}

export interface DisposalReportItem {
  assetCode: string;
  assetName: string;
  category: string;
  departmentName: string;
  lifecycleStatus: string;
  originalValue: number;
  acquisitionDate: string;
  disposalDate: string;
  disposalReason: string;
}
