import { spacingSteps, type SpacingStep } from "./tokens";

/** Shared Puck field for picking a spacing token. */
export const spacingField = (label: string) => ({
  type: "select" as const,
  label,
  options: spacingSteps.map((step) => ({ label: step.toUpperCase(), value: step })),
});

/** Only known steps reach the inline style, whatever the page file says. */
export const spaceVar = (step: SpacingStep | undefined) =>
  `var(--cr-space-${step && (spacingSteps as readonly string[]).includes(step) ? step : "none"})`;
