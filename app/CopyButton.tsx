"use client";

import { useState } from "react";

export function CopyButton() {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(
        "git clone https://github.com/AspiringWebGaurav/devlabs.git"
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      className="command-btn"
      onClick={copyCommand}
      id="copy-cmd-btn"
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}
