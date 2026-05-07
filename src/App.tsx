/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, Settings2, FileText, ChevronDown, Plus, X } from 'lucide-react';
import { ProductionCard } from './components/ProductionCard';
import { ProductionData, LabelStyle, defaultLabelStyle, FieldStyle } from './types';

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
                padding: 2.5mm 5mm !important;
                box-sizing: border-box !important;
                background: white !important;
                page-break-after: always !important;
                position: relative !important;
              }
              
              .grid-container {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                grid-template-rows: repeat(7, 1fr) !important;
                width: 200mm !important;
                height: 292mm !important;
                column-gap: 5mm !important;
                row-gap: 5mm !important;
                margin: 0 auto !important;
              }
              
              [id="production-card"] {
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                border: 2px solid #000000 !important;
                box-sizing: border-box !important;
                padding: 1.5mm !important;
                color: #000000 !important;
                background: #ffffff !important;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
                page-break-inside: avoid !important;
                line-height: 1.2 !important;
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
    const itemsPerSheet = 21; 
    const pages = [];
    
    for (let i = 0; i < labels.length; i += itemsPerSheet) {
      pages.push(labels.slice(i, i + itemsPerSheet));
    }

    return pages.map((page, pageIdx) => (
      <div key={pageIdx} className="page-container page-preview print:mb-0 print:break-after-page">
        <div className="grid-container grid-preview">
          {page.map((labelData, labelIdx) => (
            <ProductionCard key={labelIdx} data={labelData} styleConfig={styleConfig} />
          ))}
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
      {/* Sidebar: Inputs */}
      <div className="w-full lg:w-[380px] bg-white border-r border-zinc-200 p-5 lg:h-screen lg:fixed lg:top-0 lg:left-0 no-print flex flex-col shadow-xl z-20">
        <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-black p-1.5 rounded text-white">
              <FileText size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight uppercase leading-tight">Elastic Bundle Card Generate</h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              showSettings 
                ? 'bg-black text-white' 
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Settings2 size={12} />
            {showSettings ? 'Close Settings' : 'Settings'}
          </button>
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
          {!showSettings ? (
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
      <div className="flex-1 bg-zinc-100 p-8 lg:h-screen lg:overflow-y-auto preview-scroll relative lg:ml-[380px]">
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
