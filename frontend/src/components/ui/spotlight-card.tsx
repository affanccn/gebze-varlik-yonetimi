import React, { useEffect, useRef, ReactNode } from 'react';

export interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  glowColor?:
    | 'blue'
    | 'purple'
    | 'green'
    | 'red'
    | 'orange'
    | 'emerald'
    | 'amber'
    | 'teal'
    | 'rose'
    | 'indigo'
    | 'slate';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean; // When true, ignores size prop and uses width/height or className
}

const glowColorMap: Record<string, { base: number; spread: number; saturation?: number; lightness?: number }> = {
  blue: { base: 215, spread: 180, saturation: 100, lightness: 60 },
  purple: { base: 275, spread: 220, saturation: 100, lightness: 65 },
  green: { base: 125, spread: 180, saturation: 100, lightness: 55 },
  emerald: { base: 155, spread: 180, saturation: 100, lightness: 55 },
  teal: { base: 175, spread: 180, saturation: 100, lightness: 55 },
  amber: { base: 38, spread: 180, saturation: 100, lightness: 55 },
  orange: { base: 26, spread: 180, saturation: 100, lightness: 55 },
  red: { base: 0, spread: 180, saturation: 100, lightness: 60 },
  rose: { base: 350, spread: 180, saturation: 100, lightness: 60 },
  indigo: { base: 245, spread: 180, saturation: 100, lightness: 65 },
  slate: { base: 215, spread: 80, saturation: 60, lightness: 65 },
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false,
  ...restProps
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--x', `${x.toFixed(1)}px`);
      card.style.setProperty('--y', `${y.toFixed(1)}px`);
      card.style.setProperty('--xp', (e.clientX / window.innerWidth).toFixed(2));
      card.style.setProperty('--yp', (e.clientY / window.innerHeight).toFixed(2));
    };

    window.addEventListener('pointermove', syncPointer, { passive: true });
    return () => window.removeEventListener('pointermove', syncPointer);
  }, []);

  const colorConfig = glowColorMap[glowColor] || glowColorMap.blue;
  const { base, spread, saturation = 100, lightness = 60 } = colorConfig;

  // Determine sizing
  const getSizeClasses = () => {
    if (customSize) {
      return ''; // Let className handle sizing
    }
    return sizeMap[size];
  };

  const getInlineStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties & Record<string, string | number> = {
      '--base': base,
      '--spread': spread,
      '--saturation': saturation,
      '--lightness': lightness,
      '--radius': '16',
      '--border': '2',
      '--size': '280',
      '--border-size': 'calc(var(--border, 2) * 1px)',
      '--spotlight-size': 'calc(var(--size, 280) * 1px)',
      '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      '--spotlight-color': 'hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 60) * 1%))',
      position: 'relative' as const,
      touchAction: 'pan-y' as const,
    };

    // Add width and height if provided
    if (width !== undefined) {
      baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return baseStyles;
  };

  const beforeAfterStyles = `
    [data-glow]::before,
    [data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      z-index: 2;
    }
    
    [data-glow]::before {
      background-image: radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        var(--x, -1000px)
        var(--y, -1000px),
        var(--spotlight-color), transparent 100%
      );
      filter: brightness(1.4);
    }
    
    [data-glow]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.55) calc(var(--spotlight-size) * 0.55) at
        var(--x, -1000px)
        var(--y, -1000px),
        hsl(0 100% 100% / var(--border-light-opacity, 0.9)), transparent 100%
      );
    }
    
    [data-glow] > [data-glow] {
      position: absolute;
      inset: -14px;
      border-radius: calc(var(--radius) * 1px + 14px);
      background-image: radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, -1000px) + 14px)
        calc(var(--y, -1000px) + 14px),
        var(--spotlight-color), transparent 70%
      );
      filter: blur(16px);
      opacity: 0.10;
      pointer-events: none;
      border: none;
      z-index: 0;
      transition: opacity 0.25s ease;
    }
    
    html.dark [data-glow] > [data-glow] {
      opacity: 0.55;
      filter: blur(18px);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        {...restProps}
        className={`
          ${getSizeClasses()}
          ${!customSize ? 'aspect-[3/4]' : ''}
          rounded-2xl 
          relative 
          ${customSize ? '' : 'grid grid-rows-[1fr_auto] p-4 gap-4'}
          ${className}
        `}
      >
        <div ref={innerRef} data-glow></div>
        {children}
      </div>
    </>
  );
};

export { GlowCard, GlowCard as SpotlightCard };
export default GlowCard;
