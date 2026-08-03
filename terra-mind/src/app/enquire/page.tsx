import { Suspense } from "react";

import { EnquireForm } from "@/components/forms/EnquireForm";

export default function EnquirePage() {
  return (
    <div className="px-4 py-12 md:px-6">
      <Suspense
        fallback={
          <div className="mx-auto max-w-xl steel-frame p-8 text-sm text-dim">
            Loading enquiry channel…
          </div>
        }
      >
        <EnquireForm />
      </Suspense>
    </div>
  );
}
