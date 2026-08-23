"use client";

import { useState } from "react";
import type { InquiryFilterOptions } from "../types";

export function useInquiryFilters(initialFilters: InquiryFilterOptions = { status: "all", page: 1, pageSize: 10 }) {
  const [filters, setFilters] = useState<InquiryFilterOptions>(initialFilters);

  const setStatus = (status: InquiryFilterOptions["status"]) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const setSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  };

  const setPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return {
    filters,
    setStatus,
    setSearch,
    setPage,
  };
}
