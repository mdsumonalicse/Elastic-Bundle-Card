import React, { useLayoutEffect, useRef, useState } from 'react';
import { ProductionData, LabelStyle } from '../types';

interface ProductionCardProps {
  data: ProductionData;
  styleConfig?: LabelStyle;
  className?: string;
}

const AutoShrink: React.FC<{ 
  text: string; 
  fontSize: number; 
  className?: string; 
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
}> = ({ text, fontSize, className, textAlign = 'left', letterSpacing = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (container && textEl) {
      const containerWidth = container.offsetWidth;
      const textWidth = textEl.scrollWidth;
      
      if (textWidth > containerWidth) {
        setScale(Math.max(0.4, containerWidth / textWidth));
      } else {
        setScale(1);
      }
    }
  }, [text, fontSize, letterSpacing]);

  const originMap = {
    left: 'origin-left',
    center: 'origin-center',
    right: 'origin-right'
  };

  const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <div ref={containerRef} className={`w-full overflow-hidden leading-none ${alignMap[textAlign]} ${className}`}>
      <span 
        ref={textRef} 
        className={`inline-block whitespace-nowrap ${originMap[textAlign]}`}
        style={{ 
          transform: `scale(${scale})`, 
          fontSize: `${fontSize}px`,
          letterSpacing: `${letterSpacing}px`
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const ProductionCard: React.FC<ProductionCardProps> = ({ data, styleConfig, className = '' }) => {
  const baseSize = styleConfig?.fontSize ?? 10;
  const xOffset = styleConfig?.contentXOffset ?? 0;
  const fieldStyles = styleConfig?.fields || {};

  const getFieldStyle = (key: keyof ProductionData) => {
    const custom = fieldStyles[key];
    return {
      fontSize: custom?.fontSize ?? baseSize,
      textAlign: custom?.textAlign ?? 'left',
      letterSpacing: custom?.letterSpacing ?? 0
    };
  };

  const labelSize = Math.max(7, baseSize - 1);
  const valueSize = baseSize;
  const bigValueSize = baseSize + 2;

  const renderField = (fieldKey: keyof ProductionData, isBig: boolean = false) => {
    const style = getFieldStyle(fieldKey);
    const labelText = styleConfig?.fieldLabels?.[fieldKey] ?? fieldKey;
    const fontSize = isBig ? (style.fontSize + 2) : style.fontSize;

    return (
      <>
        <div className="font-bold whitespace-nowrap" style={{ fontSize: `${labelSize}px` }}>{labelText}</div>
        <div className="font-bold" style={{ fontSize: `${labelSize}px` }}>:</div>
        <div className="uppercase tracking-tight font-bold">
          <AutoShrink 
            text={data[fieldKey]} 
            fontSize={fontSize} 
            textAlign={style.textAlign}
            letterSpacing={style.letterSpacing}
          />
        </div>
      </>
    );
  };

  return (
    <div 
      className={`relative border-2 border-black bg-white font-sans text-black leading-tight overflow-hidden p-[1.5mm] ${className}`} 
      id="production-card"
    >
      <div 
        className="grid grid-cols-[max-content_min-content_1fr_max-content_min-content_auto] gap-x-1 gap-y-1.5 items-baseline"
        style={{ transform: `translateX(${xOffset}px)` }}
      >
        {renderField('buyer')}
        {renderField('size', true)}

        {renderField('refNo')}
        {renderField('bQty', true)}

        {renderField('style')}
        {renderField('bNo', true)}

        {renderField('gColour')}
        {renderField('bSl')}

        {renderField('iColour')}
        {renderField('slNo')}
      </div>

      {/* Subtle branding text at the bottom right */}
      <div 
        className="absolute bottom-[6px] right-[6px] text-black font-bold uppercase leading-[1.1] pointer-events-none whitespace-pre-line"
        style={{ 
          fontSize: `${fieldStyles.footer?.fontSize ?? 5}px`,
          textAlign: fieldStyles.footer?.textAlign ?? 'right',
          letterSpacing: `${fieldStyles.footer?.letterSpacing ?? 0}px`
        }}
      >
        {styleConfig?.bundleCardLabel || 'Elastic Bundle Card'}
      </div>
    </div>
  );
};
