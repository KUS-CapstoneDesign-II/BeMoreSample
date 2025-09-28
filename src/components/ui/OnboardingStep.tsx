"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type OnboardingStepProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; onClick: () => void; variant?: "default" | "secondary" };
  secondaryCta?: { label: string; onClick: () => void };
  children?: React.ReactNode;
};

export function OnboardingStep({ icon, title, description, cta, secondaryCta, children }: OnboardingStepProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="p-6 space-y-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="flex items-start gap-3">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
        <div className="flex gap-2 pt-2">
          {cta && <Button onClick={cta.onClick} variant={cta.variant ?? "default"}>{cta.label}</Button>}
          {secondaryCta && <Button onClick={secondaryCta.onClick} variant="secondary">{secondaryCta.label}</Button>}
        </div>
      </Card>
    </motion.div>
  );
}
