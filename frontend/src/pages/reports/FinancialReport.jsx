import { useState } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import ProfitLoss from "../finance/ProfitLoss";

// Financial report reuses ProfitLoss with date range filter
export default function FinancialReport() {
  return <ProfitLoss />;
}
