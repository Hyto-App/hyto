"use client";

import type { ReactNode } from "react";
import { Marco } from "@/components/admin/Marco";

export function MarcoVoluntario({ children }: { children: ReactNode }) {
  return <Marco>{children}</Marco>;
}
