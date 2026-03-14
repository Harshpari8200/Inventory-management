"use client";

import { Box } from "lucide-react";
import { motion } from "motion/react";

export function AppLogo({ className }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
                <Box className="text-white w-6 h-6" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight text-foreground">
                Inventory
            </span>
        </div>
    );
}
