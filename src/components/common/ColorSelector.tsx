'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Check } from 'lucide-react';
import { COLOR_OPTIONS } from '@/lib/constants';

interface ColorSelectorProps {
  value?: string;
  onChange?: (color: string) => void;
  multiple?: boolean;
  selectedColors?: string[];
  onSelectionChange?: (colors: string[]) => void;
  title?: string;
  showCard?: boolean;
}

export function ColorSelector({
  value,
  onChange,
  multiple = false,
  selectedColors = [],
  onSelectionChange,
  title = '颜色选择',
  showCard = true,
}: ColorSelectorProps) {
  const handleColorClick = (colorValue: string) => {
    if (multiple && onSelectionChange) {
      if (selectedColors.includes(colorValue)) {
        onSelectionChange(selectedColors.filter(c => c !== colorValue));
      } else {
        onSelectionChange([...selectedColors, colorValue]);
      }
    } else if (onChange) {
      onChange(colorValue);
    }
  };

  const handleClear = () => {
    if (multiple && onSelectionChange) {
      onSelectionChange([]);
    } else if (onChange) {
      onChange('');
    }
  };

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {multiple ? `已选择 ${selectedColors.length} 种颜色` : value || '请选择颜色'}
        </span>
        {(multiple ? selectedColors.length > 0 : value) && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-3 w-3 mr-1" />
            清空
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map(color => {
          const isSelected = multiple 
            ? selectedColors.includes(color.value)
            : value === color.value;
          
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => handleColorClick(color.value)}
              className={`
                relative flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all
                ${isSelected 
                  ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                  : 'border-border hover:bg-muted'
                }
              `}
            >
              <span 
                className="w-4 h-4 rounded-sm border border-border"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-sm">{color.label}</span>
              {isSelected && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}

export default ColorSelector;
