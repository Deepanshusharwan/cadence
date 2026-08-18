"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { CloseIcon } from "@/components/icons";

type FeedbackType = "bug" | "idea" | "other";

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<FeedbackType>("idea");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.submitFeedback({ type, message: message.trim() });
      toast.show("Thanks — feedback sent.");
      onClose();
    } catch {
      toast.show("Couldn't send that — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-ink-black/8 bg-pure-white p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-heading-sm font-bold tracking-[-0.242px] text-ink-black">
              Send feedback
            </h2>
            <p className="mt-1 text-body-sm text-graphite">
              A bug, an idea, or anything else — tell us what&apos;s not working
              or what you&apos;d want.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-ink-black/40 hover:bg-ink-black/5 hover:text-ink-black"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors ${
                type === t.value
                  ? "bg-sky-tint text-notion-blue"
                  : "text-ink-black/60 hover:bg-ink-black/5 hover:text-ink-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="What's on your mind?"
          autoFocus
          className="mt-3 w-full resize-none rounded-lg border border-ink-black/12 px-3 py-2 text-body-sm text-ink-black placeholder:text-ink-black/30 focus:border-notion-blue focus:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-body-sm font-medium text-ink-black/95 hover:bg-ink-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!message.trim() || submitting}
            className="rounded-lg bg-notion-blue px-4 py-2 text-body-sm font-medium text-pure-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
