export interface ProductionData {
  buyer: string;
  size: string;
  refNo: string;
  bQty: string;
  style: string;
  bNo: string;
  gColour: string;
  bSl: string;
  iColour: string;
  startBSl?: string;
}

export interface FieldStyle {
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  fontWeight?: string;
}

export interface LabelStyle {
  fontSize: number;
  contentXOffset: number;
  fields: {
    [key in keyof ProductionData | 'footer']?: FieldStyle;
  };
  fieldLabels: {
    [key in keyof ProductionData]: string;
  };
  bundleCardLabel: string;
}

export const defaultLabelStyle: LabelStyle = {
  fontSize: 11,
  contentXOffset: 0,
  fields: {
    buyer: { textAlign: 'left', letterSpacing: 0 },
    size: { textAlign: 'left', letterSpacing: 0 },
    refNo: { textAlign: 'left', letterSpacing: 0 },
    bQty: { textAlign: 'left', letterSpacing: 0 },
    style: { textAlign: 'left', letterSpacing: 0 },
    bNo: { textAlign: 'left', letterSpacing: 0 },
    gColour: { textAlign: 'left', letterSpacing: 0 },
    bSl: { textAlign: 'left', letterSpacing: 0 },
    iColour: { textAlign: 'left', letterSpacing: 0 },
    footer: { textAlign: 'right', letterSpacing: 0, fontSize: 5 }
  },
  fieldLabels: {
    buyer: 'Buyer',
    size: 'Size',
    refNo: 'Ref. No',
    bQty: 'B Qty',
    style: 'Style',
    bNo: 'B No',
    gColour: 'S. Color',
    bSl: 'B SL',
    iColour: 'Color'
  },
  bundleCardLabel: 'Elastic Bundle Card'
};

export const defaultProductionData: ProductionData = {
  buyer: "CALLIOPE",
  size: "S",
  refNo: "110--0279",
  bQty: "40",
  style: "GOKD52770PFANI",
  bNo: "1",
  gColour: "VAR-AZZVRO.CHIARO",
  bSl: "1-40",
  iColour: "VAR-AZZVRO.CHIARO",
};
