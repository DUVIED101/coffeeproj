"use client";

import { useParams } from "next/navigation";
import React from "react";
import { JobForm } from "@/components/JobForm";

export default function EditJobPage(): React.JSX.Element {
  const params = useParams<{ jobId: string }>();
  return <JobForm editJobId={params.jobId} />;
}
