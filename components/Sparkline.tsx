"use client";

import { motion } from "motion/react";

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}

export function Sparkline({ data, color = "currentColor", width = 80, height = 24 }: SparklineProps) {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);

    const points = data.map((val, i) => ({
        x: i * step,
        y: height - ((val - min) / range) * height,
    }));

    const pathData = `M ${points[0].x} ${points[0].y} ` +
        points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");

    return (
        <svg width={width} height={height} className="overflow-visible">
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
