'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Check } from 'lucide-react';
import { SIZE_OPTIONS, SIZE_GROUPS } from '@/lib/constants';

interface SizeSelectorProps {
  value?: string;
  onChange?: (size: string) => void;
  multiple?: boolean;
  selectedSizes?: string[];
  onSelectionChange?: (sizes: string[]) => void;
  title?: string;
  showCard?: boolean;
  showGroups?: boolean;
  customSizes?: string[];
}

export function SizeSelector({
  value,
  onChange,
  multiple = false,
  selectedSizes = [],
  onSelectionChange,
  title = '尺码选择',
  showCard = true,
  showGroups = false,
  customSizes,
}: SizeSelectorProps) {
  const sizes = customSizes || SIZE_OPTIONS;

  const handleSizeClick = (sizeValue: string) => {
    if (multiple && onSelectionChange) {
      if (selectedSizes.includes(sizeValue)) {
        onSelectionChange(selectedSizes.filter(s => s !== sizeValue));
      } else {
        onSelectionChange([...selectedSizes, sizeValue]);
      }
    } else if (onChange) {
      onChange(sizeValue);
    }
  };

  const handleSelectAll = () => {
    if (multiple && onSelectionChange) {
      onSelectionChange(sizes);
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
          {multiple 
            ? `已选择 ${selectedSizes.length} 个尺码：${selectedSizes.join(', ')}` 
            : value || '请选择尺码'
          }
        </span>
        <div className="flex items-center gap-2">
          {multiple && (
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              全选
            </Button>
          )}
          {(multiple ? selectedSizes.length > 0 : value) && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-3 w-3 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

      {showGroups ? (
        <div className="space-y-4">
          {Object.entries(SIZE_GROUPS).map(([key, group]) => (
            <div key={key}>
              <div className="text-sm font-medium mb-2">{group.label}</div>
              <div className="flex flex-wrap gap-2">
                {group.options.map(size => {
                  const isSelected = multiple 
                    ? selectedSizes.includes(size)
                    : value === size;
                  
                  return (
                    <Badge
                      key={size}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`
                        cursor-pointer px-3 py-1.5 text-sm transition-colors
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                        }
                      `}
                      onClick={() => handleSizeClick(size)}
                    >
                      {size}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sizes.map(size => {
            const isSelected = multiple 
              ? selectedSizes.includes(size)
              : value === size;
            
            return (
              <Badge
                key={size}
                variant={isSelected ? 'default' : 'outline'}
                className={`
                  cursor-pointer px-3 py-1.5 text-sm transition-colors
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                  }
                `}
                onClick={() => handleSizeClick(size)}
              >
                {size}
                {isSelected && multiple && (
                  <X 
                    className="h-3 w-3 ml-1" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSizeClick(size);
                    }} 
                  />
                )}
              </Badge>
            );
          })}
        </div>
      )}
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

export default SizeSelector;
