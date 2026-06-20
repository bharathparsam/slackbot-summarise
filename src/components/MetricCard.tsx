import React from "react";
import { motion } from "motion/react";
import * as Icons from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Icons;
  color: "red" | "orange" | "amber" | "emerald" | "blue" | "slate";
  description?: string;
  badge?: string;
}

const colorMap = {
  red: {
    bg: "bg-red-50",
    border: "border-red-100",
    text: "text-red-700",
    iconBg: "bg-red-500",
    glow: "shadow-red-100",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-100",
    text: "text-orange-700",
    iconBg: "bg-orange-500",
    glow: "shadow-orange-100",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    iconBg: "bg-amber-500",
    glow: "shadow-amber-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    iconBg: "bg-emerald-500",
    glow: "shadow-emerald-100",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    iconBg: "bg-blue-600",
    glow: "shadow-blue-100",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-100",
    text: "text-slate-800",
    iconBg: "bg-gradient-to-r from-slate-700 to-slate-900",
    glow: "shadow-slate-100",
  },
};

export default function MetricCard({ title, value, icon, color, description, badge }: MetricCardProps) {
  const IconComponent = Icons[icon] as React.ComponentType<{ className?: string }>;
  const styles = colorMap[color];

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`relative p-5 bg-white border ${styles.border} rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full`}
      id={`metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl mt-1.5 font-bold text-slate-900 font-sans tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg text-white ${styles.iconBg} shadow-xs`}>
          {IconComponent && <IconComponent className="w-5 h-5" />}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-xs font-medium truncate">{description || "Platform Activity tracking"}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles.bg} ${styles.text}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-xl bg-gradient-to-r from-transparent via-transparent to-transparent hover:via-slate-200" />
    </motion.div>
  );
}
