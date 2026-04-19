import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height,
    animation = 'pulse',
}) => {
    const baseClasses = 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200';

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer bg-[length:200%_100%]',
        none: '',
    };

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'text' ? '1em' : undefined),
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={style}
        />
    );
};

// Preset skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                variant="text"
                height="0.875rem"
                width={i === lines - 1 ? '80%' : '100%'}
            />
        ))}
    </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton width="40%" height="1.25rem" />
                <Skeleton width="20%" height="2rem" variant="rectangular" />
            </div>
            <Skeleton height="200px" variant="rectangular" />
            <div className="space-y-2">
                <SkeletonText lines={2} />
            </div>
        </div>
    </div>
);

export const SkeletonKpiCard: React.FC = () => (
    <div className="rounded-xl border border-teal-100 bg-white flex flex-col relative overflow-hidden shadow-[0_12px_35px_-25px_rgba(15,118,110,0.35)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse" />
        <header className="py-3 px-3.5 flex justify-between items-center">
            <Skeleton width="140px" height="1rem" />
            <Skeleton width="70px" height="32px" variant="rectangular" />
        </header>
        <div className="px-3.5 pb-3">
            <div className="flex justify-between mb-2">
                <Skeleton width="120px" height="0.75rem" />
                <Skeleton width="80px" height="0.75rem" />
            </div>
            <Skeleton height="8px" variant="rectangular" className="rounded-full" />
        </div>
        <footer className="flex items-stretch border-t border-teal-50 bg-teal-50/50">
            <div className="flex-1 py-3 px-3.5">
                <Skeleton width="60px" height="0.625rem" className="mb-2" />
                <Skeleton width="90px" height="1.25rem" />
            </div>
            <div className="w-px bg-teal-100" />
            <div className="flex-1 py-3 px-3.5">
                <Skeleton width="60px" height="0.625rem" className="mb-2" />
                <Skeleton width="90px" height="1.25rem" />
            </div>
        </footer>
    </div>
);

export const SkeletonChart: React.FC<{ height?: string }> = ({ height = '300px' }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
            <Skeleton width="150px" height="1.25rem" />
            <Skeleton width="120px" height="2rem" variant="rectangular" />
        </div>
        <Skeleton height={height} variant="rectangular" />
        <div className="mt-4 flex justify-between">
            <Skeleton width="80px" height="1rem" />
            <Skeleton width="80px" height="1rem" />
            <Skeleton width="80px" height="1rem" />
        </div>
    </div>
);

export default Skeleton;
