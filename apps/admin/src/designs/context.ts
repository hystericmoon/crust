import type { DesignKind } from "@crust/blocks";
import { createContext } from "react";

/** F082: which design the open editor is for (the layout gallery offers its starting designs). */
export const DesignKindContext = createContext<DesignKind | null>(null);
