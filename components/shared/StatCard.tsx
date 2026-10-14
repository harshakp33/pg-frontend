'use client';

import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  iconColor?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconColor = 'text-primary bg-primary/10',
  onClick,
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-5 transition-all duration-200 border border-border/80 bg-card hover:shadow-md hover:border-border',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl" suppressHydrationWarning>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl transition-colors', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
