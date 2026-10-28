import { spacingSteps, type SpacingStep } from "./tokens";

/** Shared Puck field for picking a spacing token. */
export const spacingField = (label: string) => ({
  type: "select" as const,
  label,
  options: spacingSteps.map((step) => ({ label: step.toUpperCase(), value: step })),
});

export const spaceVar = (step: SpacingStep | undefined) => `var(--cr-space-${step ?? "none"})`;
