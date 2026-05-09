/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, Settings2, FileText, ChevronDown, Plus, X, Search, Save, List, Trash2, History, User as UserIcon } from 'lucide-react';
import { ProductionCard } from './components/ProductionCard';
import { ProductionData, LabelStyle, defaultLabelStyle, FieldStyle, SavedReport } from './types';
import { 
  db, 
  handleFirestoreError, 
  OperationType, 
  collection, 
  setDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  getGuestId
} from './lib/firebase';

const INITIAL_BUYERS = [
  'Calliope', 'Kesko', 'O/Marines', 'US Polo', 'George', 'Gildan', 'Zizzi', 
  'Button', 'Zippar', 'CK', 'Terranova', 'Teddy', 'W/Secret', 'T/Australia', 'ICA', 'RIMI'
];

const DEFAULT_DATA: ProductionData = {
  buyer: 'Calliope',
  refNo: '110---0279',
  style: 'GOKD52770PFANI',
  gColour: 'VAR-AZZVRO.CHIARO',
  iColour: 'VAR-AZZVRO.CHIARO',
  size: 'S',
  bQty: '40',
  bNo: '1',
  bSl: '1-40',
  slNo: '01',
  startBSl: '1'
};

export default function App() {
  const [styleConfig, setStyleConfig] = useState<LabelStyle>(() => {
    try {
      const saved = localStorage.getItem('garment_label_style');
      if (!saved) return defaultLabelStyle;
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure new fields exist
      return {
        ...defaultLabelStyle,
        ...parsed,
        fields: { ...defaultLabelStyle.fields, ...(parsed.fields || {}) },
        fieldLabels: { ...defaultLabelStyle.fieldLabels, ...(parsed.fieldLabels || {}) }
      };
    } catch (e) {
      return defaultLabelStyle;
    }
  });

  const [buyers, setBuyers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('garment_buyers');
      return saved ? JSON.parse(saved) : INITIAL_BUYERS;
    } catch (e) {
      return INITIAL_BUYERS;
    }
  });

  const [newBuyer, setNewBuyer] = useState('');
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);

  const [specData, setSpecData] = useState<ProductionData>(() => {
    try {
      const saved = localStorage.getItem('garment_spec_data');
      if (!saved) return DEFAULT_DATA;
      const parsed = JSON.parse(saved);
      // Explicitly merge with DEFAULT_DATA to ensure all fields like startBSl exist
      return { ...DEFAULT_DATA, ...parsed };
    } catch (e) {
      return DEFAULT_DATA;
    }
  });

  const [labelCount, setLabelCount] = useState(() => {
    try {
      const saved = localStorage.getItem('garment_label_count');
      return saved ? Math.min(200, Math.max(1, parseInt(saved))) : 12;
    } catch (e) {
      return 12;
    }
  });

  useEffect(() => {
    localStorage.setItem('garment_label_style', JSON.stringify(styleConfig));
  }, [styleConfig]);

  useEffect(() => {
    localStorage.setItem('garment_spec_data', JSON.stringify(specData));
  }, [specData]);

  useEffect(() => {
    localStorage.setItem('garment_label_count', labelCount.toString());
  }, [labelCount]);

  useEffect(() => {
    localStorage.setItem('garment_buyers', JSON.stringify(buyers));
  }, [buyers]);

  const handleAddBuyer = () => {
    const trimmed = newBuyer.trim();
    if (trimmed && !buyers.includes(trimmed)) {
      setBuyers([...buyers, trimmed]);
      setSpecData(prev => ({ ...prev, buyer: trimmed }));
      setNewBuyer('');
      setIsAddingBuyer(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSpecData(prev => ({ ...prev, [name]: value }));
  };

  // Generate labels with automatic calculations
  const qty = parseInt(specData.bQty) || 0;
  const startBNo = parseInt(specData.bNo) || 1;
  const startBSlValue = parseInt(specData.startBSl || '1') || 1;

  const labels = Array(labelCount).fill(null).map((_, i) => {
    const currentBNo = startBNo + i;
    const startSL = startBSlValue + (i * qty);
    const endSL = startBSlValue + ((i + 1) * qty) - 1;
    
    return {
      ...specData,
      bNo: currentBNo.toString(),
      bSl: `${startSL}-${endSL}`,
    };
  });

  const [isExporting, setIsExporting] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const guestId = getGuestId();

  // Firestore Data Listener
  useEffect(() => {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedReports = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedReport[];
      
      // Sort by timestamp descending
      setReports(loadedReports.sort((a, b) => b.timestamp - a.timestamp));
      setIsDataLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
      setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveReport = async () => {
    try {
      setSaveError(null);
      const reportsRef = collection(db, 'reports');
      const newId = crypto.randomUUID();
      const reportDocRef = doc(db, 'reports', newId);
      
      const newReport: SavedReport = {
        ...specData,
        id: newId,
        ownerId: guestId,
        timestamp: Date.now()
      };
      
      await setDoc(reportDocRef, newReport);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setSaveError(null), 5000);
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this report from the cloud?')) return;

    try {
      const reportDocRef = doc(db, 'reports', id);
      await deleteDoc(reportDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    }
  };

  const loadReport = (report: SavedReport) => {
    // We only want to load the production data part
    const { id, timestamp, ...data } = report;
    setSpecData(data);
    setShowReports(false);
  };

  const filteredReports = reports.filter(report => {
    const query = searchQuery.toLowerCase();
    return (
      report.style.toLowerCase().includes(query) ||
      report.refNo.toLowerCase().includes(query) ||
      report.slNo.toLowerCase().includes(query)
    );
  });

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.querySelector('.print-area');
      if (!element) {
        throw new Error('Print area element not found');
      }

      // Hide non-print elements temporarily
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

      const opt = {
        margin: 0,
        filename: `Production-Labels-${specData.buyer}-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 3,
          useCORS: true,
          logging: false,
          letterRendering: false,
          windowWidth: 1200,
          onclone: (clonedDocument: Document) => {
            const style = clonedDocument.createElement('style');
            style.innerHTML = `
              :root {
                --color-zinc-50: #fafafa !important;
                --color-zinc-100: #f4f4f5 !important;
                --color-zinc-200: #e4e4e7 !important;
                --color-black: #000000 !important;
                --color-white: #ffffff !important;
              }
              
              .print-area {
                background: white !important;
                padding: 0 !important;
                width: 210mm !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                display: block !important;
              }
              
              .page-container {
                width: 210mm !important;
                height: 297mm !important;
                padding: ${styleConfig.pagePadding}mm !important;
                box-sizing: border-box !important;
                background: white !important;
                page-break-after: always !important;
                position: relative !important;
                overflow: hidden !important;
              }
              
              .grid-container {
                display: grid !important;
                grid-template-columns: ${styleConfig.cardWidth ? `repeat(${styleConfig.gridColumns}, ${styleConfig.cardWidth}mm)` : `repeat(${styleConfig.gridColumns}, 1fr)`} !important;
                grid-template-rows: ${styleConfig.cardHeight ? `repeat(${styleConfig.gridRows}, ${styleConfig.cardHeight}mm)` : `repeat(${styleConfig.gridRows}, 1fr)`} !important;
                width: 100% !important;
                height: 100% !important;
                column-gap: ${styleConfig.columnGap}mm !important;
                row-gap: ${styleConfig.rowGap}mm !important;
                margin: 0 auto !important;
                align-content: start !important;
                justify-content: start !important;
              }
              
              [id="production-card"] {
                width: ${styleConfig.cardWidth ? `${styleConfig.cardWidth}mm` : '100%'} !important;
                height: ${styleConfig.cardHeight ? `${styleConfig.cardHeight}mm` : '100%'} !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                border: 2px solid #000000 !important;
                box-sizing: border-box !important;
                padding: ${styleConfig.cardPadding}mm !important;
                color: #000000 !important;
                background: #ffffff !important;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
                page-break-inside: avoid !important;
              }
              
              [id="production-card"] > div:first-child {
                row-gap: ${styleConfig.lineSpacing}mm !important;
              }

              .page-number {
                position: absolute !important;
                bottom: 5mm !important;
                left: 0 !important;
                right: 0 !important;
                text-align: center !important;
                font-size: 10px !important;
                color: #666666 !important;
                font-family: ui-sans-serif, system-ui, sans-serif !important;
              }
              
              .font-bold { font-weight: 700 !important; }
              .uppercase { text-transform: uppercase !important; }
              
              /* Force all text to be pure black and avoid any squishing */
              * {
                color: #000000 !important;
                border-color: #000000 !important;
                -webkit-font-smoothing: antialiased !important;
                overflow: visible !important;
              }
            `;
            clonedDocument.head.appendChild(style);
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
      
      // Cleanup style visibility
      noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
    } catch (err) {
      console.error('PDF Export failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`PDF Generation failed: ${errorMessage}. If the file didn't start downloading, please use the "Printer" icon and choose "Save as PDF" manually.`);
    } finally {
      setIsExporting(false);
    }
  };

  const renderPages = () => {
    const itemsPerSheet = styleConfig.gridColumns * styleConfig.gridRows; 
    const pages = [];
    
    for (let i = 0; i < labels.length; i += itemsPerSheet) {
      pages.push(labels.slice(i, i + itemsPerSheet));
    }

    return pages.map((page, pageIdx) => (
      <div 
        key={pageIdx} 
        className="page-container print:mb-0 print:break-after-page shadow-2xl mb-12 bg-white"
        style={{
          width: '210mm',
          height: '297mm',
          padding: `${styleConfig.pagePadding}mm`,
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="grid-container w-full h-full"
          style={{
            display: 'grid',
            gridTemplateColumns: styleConfig.cardWidth ? `repeat(${styleConfig.gridColumns}, ${styleConfig.cardWidth}mm)` : `repeat(${styleConfig.gridColumns}, 1fr)`,
            gridTemplateRows: styleConfig.cardHeight ? `repeat(${styleConfig.gridRows}, ${styleConfig.cardHeight}mm)` : `repeat(${styleConfig.gridRows}, 1fr)`,
            columnGap: `${styleConfig.columnGap}mm`,
            rowGap: `${styleConfig.rowGap}mm`,
            alignContent: 'start',
            justifyContent: 'start'
          }}
        >
          {page.map((labelData, labelIdx) => {
            const colIdx = labelIdx % styleConfig.gridColumns;
            let offset = 0;
            if (colIdx === 0) {
              offset = styleConfig.leftColumnOffset;
            } else if (colIdx === styleConfig.gridColumns - 1) {
              offset = styleConfig.rightColumnOffset;
            }

            return (
              <ProductionCard 
                key={labelIdx} 
                data={labelData} 
                styleConfig={styleConfig} 
                hOffset={offset} 
              />
            );
          })}
        </div>
        <div className="page-number">
          Page {pageIdx + 1} of {pages.length}
        </div>
        {/* html2pdf specific page break marker */}
        {pageIdx < pages.length - 1 && <div className="html2pdf__page-break" style={{ height: '0', pageBreakAfter: 'always' }} />}
      </div>
    ));
  };

  const [selectedField, setSelectedField] = useState<keyof ProductionData | 'footer' | 'all'>('all');

  const updateFieldStyle = (field: keyof ProductionData | 'footer' | 'all', updates: Partial<FieldStyle>) => {
    setStyleConfig(prev => {
      const newFields = { ...prev.fields };
      if (field === 'all') {
        Object.keys(newFields).forEach(key => {
          newFields[key as any] = {
            ...newFields[key as any],
            ...updates
          };
        });
        return {
          ...prev,
          fontSize: updates.fontSize ?? prev.fontSize,
          fields: newFields
        };
      } else {
        newFields[field] = {
          ...newFields[field],
          ...updates
        };
        return {
          ...prev,
          fields: newFields
        };
      }
    });
  };

  const getFieldStyle = (field: keyof ProductionData | 'footer' | 'all') => {
    if (field === 'all') {
      return {
        fontSize: styleConfig.fontSize,
        textAlign: 'left' as const,
        letterSpacing: 0
      };
    }
    return styleConfig.fields?.[field] || { textAlign: 'left', letterSpacing: 0 };
  };

  const currentFieldStyle = getFieldStyle(selectedField);

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-100">
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .page-container {
            width: 210mm !important;
            height: 297mm !important;
            padding: ${styleConfig.pagePadding}mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
            position: relative !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          .grid-container {
            display: grid !important;
            grid-template-columns: ${styleConfig.cardWidth ? `repeat(${styleConfig.gridColumns}, ${styleConfig.cardWidth}mm)` : `repeat(${styleConfig.gridColumns}, 1fr)`} !important;
            grid-template-rows: ${styleConfig.cardHeight ? `repeat(${styleConfig.gridRows}, ${styleConfig.cardHeight}mm)` : `repeat(${styleConfig.gridRows}, 1fr)`} !important;
            width: 100% !important;
            height: 100% !important;
            column-gap: ${styleConfig.columnGap}mm !important;
            row-gap: ${styleConfig.rowGap}mm !important;
            margin: 0 !important;
            align-content: start !important;
            justify-content: start !important;
          }
          [id="production-card"] {
            width: ${styleConfig.cardWidth ? `${styleConfig.cardWidth}mm` : '100%'} !important;
            height: ${styleConfig.cardHeight ? `${styleConfig.cardHeight}mm` : '100%'} !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            border: 2px solid #000000 !important;
          }
          .page-number {
            position: absolute !important;
            bottom: 5mm !important;
            left: 0 !important;
            right: 0 !important;
            text-align: center !important;
            font-size: 10px !important;
            color: #000000 !important;
            font-weight: bold !important;
          }
        }
      `}</style>
      {/* Sidebar: Inputs */}
      <div className="w-full lg:w-[480px] bg-white border-r border-zinc-200 p-5 lg:h-screen lg:fixed lg:top-0 lg:left-0 no-print flex flex-col shadow-xl z-20">
        <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-black p-1.5 rounded text-white">
              <FileText size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight uppercase leading-tight">Elastic Bundle Card Generate</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                setShowReports(!showReports);
                if (showSettings) setShowSettings(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                showReports 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <History size={12} />
              {showReports ? 'Close Reports' : 'Reports'}
            </button>
            <button 
              onClick={() => {
                setShowSettings(!showSettings);
                if (showReports) setShowReports(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                showSettings 
                  ? 'bg-black text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Settings2 size={12} />
              {showSettings ? 'Close' : 'Settings'}
            </button>
          </div>
        </div>

        {/* Action Buttons at Top */}
        <div className="grid grid-cols-2 gap-2 mb-6 shrink-0">
          <button 
            onClick={handlePrint}
            className="flex-1 bg-black text-white py-3 rounded flex items-center justify-center gap-2 font-bold hover:bg-zinc-800 transition-all active:scale-[0.98] text-[11px] uppercase tracking-wider"
          >
            <Printer size={16} />
            Print
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex-1 py-3 rounded flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] text-[11px] uppercase tracking-wider ${isExporting ? 'bg-zinc-100 text-zinc-400' : 'bg-white border-2 border-black text-black hover:bg-zinc-50'}`}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <FileText size={16} />
                Download
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
          {!showSettings && !showReports ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Select Buyer</label>
                    <button 
                      onClick={() => setIsAddingBuyer(!isAddingBuyer)}
                      className={`p-1 rounded-full transition-colors ${isAddingBuyer ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                      title={isAddingBuyer ? "Cancel" : "Add Buyer"}
                    >
                      {isAddingBuyer ? <X size={14} /> : <Plus size={14} />}
                    </button>
                  </div>

                  {isAddingBuyer ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <input 
                        type="text"
                        autoFocus
                        value={newBuyer}
                        onChange={(e) => setNewBuyer(e.target.value)}
                        placeholder="New..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBuyer()}
                        className="flex-1 px-2 py-2 border border-black rounded focus:ring-0 transition-all text-sm font-medium" 
                      />
                      <button 
                        onClick={handleAddBuyer}
                        className="px-2 py-2 bg-black text-white rounded text-[10px] font-bold transition-colors uppercase"
                      >
                        OK
                      </button>
                    </motion.div>
                  ) : (
                    <div className="relative">
                      <select 
                        name="buyer"
                        value={specData.buyer}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-zinc-200 rounded appearance-none focus:border-black focus:ring-0 transition-all text-sm font-medium bg-white cursor-pointer pr-10"
                      >
                        {buyers.map(buyer => (
                          <option key={buyer} value={buyer}>{buyer}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Size</label>
                  <input 
                    name="size"
                    value={specData.size}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Ref No.</label>
                  <input 
                    name="refNo"
                    value={specData.refNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">B Qty (Bundle)</label>
                  <input 
                    name="bQty"
                    type="number"
                    value={specData.bQty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Style Code</label>
                  <input 
                    name="style"
                    value={specData.style}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Start B. No.</label>
                  <input 
                    name="bNo"
                    type="number"
                    value={specData.bNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">G. Color</label>
                  <input 
                    name="gColour"
                    value={specData.gColour}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Start B. SL</label>
                  <input 
                    name="startBSl"
                    type="number"
                    value={specData.startBSl || '1'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">I. Color</label>
                  <input 
                    name="iColour"
                    value={specData.iColour}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">SL No.</label>
                  <input 
                    name="slNo"
                    value={specData.slNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium" 
                  />
                </div>
              </div>


              <div className="space-y-1.5 pt-4 border-t border-zinc-100">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Labels on Sheet</label>
                    <input 
                      type="number"
                      min="1"
                      max="200"
                      value={labelCount}
                      onChange={(e) => setLabelCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded focus:border-black focus:ring-0 transition-all text-sm font-medium font-mono" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <button 
                  onClick={handleSaveReport}
                  className="w-full py-3 rounded flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] text-[11px] uppercase tracking-wider shadow-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save size={16} />
                  Save to Report
                </button>
              </div>
            </motion.div>
          ) : showReports ? (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {isDataLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Loading Reports...</p>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 z-10 bg-white pb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search Style, Ref or SL No..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredReports.length > 0 ? (
                      filteredReports.map(report => (
                        <div 
                          key={report.id}
                          onClick={() => loadReport(report)}
                          className="group p-3 bg-white border border-zinc-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <button 
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            className="absolute top-2 right-2 p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded">
                              {report.buyer}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              {new Date(report.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <div>
                              <div className="text-[8px] uppercase text-zinc-400 font-bold leading-none">Style</div>
                              <div className="text-[11px] font-bold text-zinc-800 truncate">{report.style}</div>
                            </div>
                            <div>
                              <div className="text-[8px] uppercase text-zinc-400 font-bold leading-none">Ref No</div>
                              <div className="text-[11px] font-bold text-zinc-800 truncate">{report.refNo}</div>
                            </div>
                            <div>
                              <div className="text-[8px] uppercase text-zinc-400 font-bold leading-none">SL No</div>
                              <div className="text-[11px] font-bold text-zinc-800">{report.slNo}</div>
                            </div>
                            <div>
                              <div className="text-[8px] uppercase text-zinc-400 font-bold leading-none">Size</div>
                              <div className="text-[11px] font-bold text-zinc-800">{report.size}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <div className="bg-zinc-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search size={20} className="text-zinc-300" />
                        </div>
                        <p className="text-zinc-500 text-sm">No reports found</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pb-6"
            >
              <div className="space-y-1.5 pt-0">
                <label className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider flex items-center gap-1.5 mb-2">
                  <Settings2 size={12} />
                  Text Customization
                </label>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Select Field to Edit</label>
                    <div className="relative">
                      <select 
                        value={selectedField}
                        onChange={(e) => setSelectedField(e.target.value as any)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded appearance-none focus:border-black focus:ring-0 transition-all text-sm font-medium bg-white cursor-pointer pr-10"
                      >
                        <option value="all">All Fields (Bulk)</option>
                        <option value="buyer">Buyer</option>
                        <option value="size">Size</option>
                        <option value="refNo">Ref No.</option>
                        <option value="bQty">B Qty</option>
                        <option value="style">Style</option>
                        <option value="bNo">B No</option>
                        <option value="gColour">G. Color</option>
                        <option value="bSl">B SL</option>
                        <option value="iColour">I. Color</option>
                        <option value="slNo">SL No</option>
                        <option value="footer">Bundle Card Header (Footer)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                        <span>Font Size</span>
                        <span>{selectedField === 'all' ? styleConfig.fontSize : (styleConfig.fields[selectedField]?.fontSize ?? styleConfig.fontSize)}px</span>
                      </div>
                      <input 
                        type="range"
                        min="5"
                        max="24"
                        step="0.5"
                        value={selectedField === 'all' ? styleConfig.fontSize : (styleConfig.fields[selectedField]?.fontSize ?? styleConfig.fontSize)}
                        onChange={(e) => updateFieldStyle(selectedField, { fontSize: parseFloat(e.target.value) })}
                        className="w-full accent-black h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                        <span>Text Alignment</span>
                        <span className="capitalize">{currentFieldStyle?.textAlign || 'left'}</span>
                      </div>
                      <div className="flex gap-1 overflow-hidden rounded border border-zinc-200">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateFieldStyle(selectedField, { textAlign: align })}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                              (currentFieldStyle?.textAlign === align) 
                                ? 'bg-black text-white' 
                                : 'bg-white text-zinc-400 hover:bg-zinc-50'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                        <span>Font Spacing</span>
                        <span>{currentFieldStyle?.letterSpacing || 0}px</span>
                      </div>
                      <input 
                        type="range"
                        min="-2"
                        max="10"
                        step="0.2"
                        value={currentFieldStyle?.letterSpacing || 0}
                        onChange={(e) => updateFieldStyle(selectedField, { letterSpacing: parseFloat(e.target.value) })}
                        className="w-full accent-black h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                      <span>Sheet Position Lock (X-Offset)</span>
                      <span>{styleConfig.contentXOffset}px</span>
                    </div>
                    <input 
                      type="range"
                      min="-20"
                      max="20"
                      value={styleConfig.contentXOffset}
                      onChange={(e) => setStyleConfig(prev => ({ ...prev, contentXOffset: parseInt(e.target.value) }))}
                      className="w-full accent-black h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <label className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider flex items-center gap-1.5 mb-2">
                    <Settings2 size={12} />
                    Grid & Layout Settings
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Grid Cols ({styleConfig.gridColumns})</label>
                      <input 
                        type="number" min="1" max="10"
                        value={styleConfig.gridColumns}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, gridColumns: parseInt(e.target.value) || 1 }))}
                        className="w-full px-2 py-1.5 border border-zinc-100 rounded text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Grid Rows ({styleConfig.gridRows})</label>
                      <input 
                        type="number" min="1" max="20"
                        value={styleConfig.gridRows}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, gridRows: parseInt(e.target.value) || 1 }))}
                        className="w-full px-2 py-1.5 border border-zinc-100 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Col Gap ({styleConfig.columnGap}mm)</label>
                      <input 
                        type="range" min="0" max="20" step="0.5"
                        value={styleConfig.columnGap}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, columnGap: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 accent-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Row Gap ({styleConfig.rowGap}mm)</label>
                      <input 
                        type="range" min="0" max="20" step="0.5"
                        value={styleConfig.rowGap}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, rowGap: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 accent-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Left Side Move ({styleConfig.leftColumnOffset}mm)</label>
                      <input 
                        type="range" min="-50" max="50" step="0.5"
                        value={styleConfig.leftColumnOffset}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, leftColumnOffset: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 accent-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Right Side Move ({styleConfig.rightColumnOffset}mm)</label>
                      <input 
                        type="range" min="-50" max="50" step="0.5"
                        value={styleConfig.rightColumnOffset}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, rightColumnOffset: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 accent-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-zinc-400">Inside Card Padding ({styleConfig.cardPadding}mm)</label>
                    <input 
                      type="range" min="0" max="10" step="0.1"
                      value={styleConfig.cardPadding}
                      onChange={(e) => setStyleConfig(prev => ({ ...prev, cardPadding: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 accent-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-zinc-400">Inside Line Spacing ({styleConfig.lineSpacing}mm)</label>
                    <input 
                      type="range" min="0" max="10" step="0.1"
                      value={styleConfig.lineSpacing}
                      onChange={(e) => setStyleConfig(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 accent-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-zinc-400">Page Outer Margin ({styleConfig.pagePadding}mm)</label>
                    <input 
                      type="range" min="0" max="30" step="1"
                      value={styleConfig.pagePadding}
                      onChange={(e) => setStyleConfig(prev => ({ ...prev, pagePadding: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 accent-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Force Card Width (mm)</label>
                      <input 
                        type="number" min="0"
                        placeholder="Auto"
                        value={styleConfig.cardWidth || ''}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, cardWidth: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="w-full px-2 py-1.5 border border-zinc-100 rounded text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-400">Force Card Height (mm)</label>
                      <input 
                        type="number" min="0"
                        placeholder="Auto"
                        value={styleConfig.cardHeight || ''}
                        onChange={(e) => setStyleConfig(prev => ({ ...prev, cardHeight: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="w-full px-2 py-1.5 border border-zinc-100 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-zinc-100">
                <label className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider flex items-center gap-1.5 mb-2">
                  <FileText size={12} />
                  Header Labels
                </label>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {(Object.keys(styleConfig.fieldLabels) as Array<keyof ProductionData>).map((key) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">
                          {key} Header
                        </label>
                      </div>
                      <input 
                        value={styleConfig.fieldLabels[key]}
                        onChange={(e) => setStyleConfig(prev => ({
                          ...prev,
                          fieldLabels: {
                            ...prev.fieldLabels,
                            [key]: e.target.value
                          }
                        }))}
                        className="w-full px-2 py-1.5 border border-zinc-100 rounded focus:border-black focus:ring-0 transition-all text-xs font-medium bg-zinc-50" 
                        placeholder={`Enter ${key} label...`}
                      />
                    </div>
                  ))}
                  <div className="space-y-1 pb-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">
                      Footer Text
                    </label>
                    <textarea 
                      value={styleConfig.bundleCardLabel}
                      onChange={(e) => setStyleConfig(prev => ({
                        ...prev,
                        bundleCardLabel: e.target.value
                      }))}
                      rows={2}
                      className="w-full px-2 py-1.5 border border-zinc-100 rounded focus:border-black focus:ring-0 transition-all text-xs font-medium bg-zinc-50 resize-none" 
                      placeholder="Enter footer branding..."
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content: Preview */}
      <div className="flex-1 bg-zinc-100 p-8 lg:h-screen lg:overflow-y-auto preview-scroll relative lg:ml-[480px]">
        {/* Notifications */}
        {showSaveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold uppercase tracking-wider text-[11px]"
            style={{ left: '50%', translateX: '-50%' }}
          >
            <div className="bg-white/20 p-1 rounded-full">
              <Plus size={14} className="rotate-45" />
            </div>
            Report Saved Successfully!
          </motion.div>
        )}

        {saveError && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 font-bold uppercase tracking-wider text-[11px] max-w-md text-center"
            style={{ left: '50%', translateX: '-50%' }}
          >
            <div className="bg-white/20 p-1 rounded-full">
              <X size={14} />
            </div>
            Save Failed: {saveError}
          </motion.div>
        )}

        <div className="mx-auto min-h-full print-area">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 no-print max-w-[210mm] mx-auto">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-[10px] font-bold uppercase tracking-widest italic">Live Preview</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">
              A4 PORTRAIT • {labelCount} LABELS
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={JSON.stringify(specData) + labelCount}
          >
            {renderPages()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
