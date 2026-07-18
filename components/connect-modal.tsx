"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEFAULT_CONNECTION } from "@/lib/nai/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConnectModal() {
  const show = useStore((s) => s.showConnect);
  const connected = useStore((s) => Boolean(s.client));
  const existing = useStore((s) => s.connection);
  const connect = useStore((s) => s.connect);
  const setUI = useStore((s) => s.setUI);

  const [token, setToken] = useState(existing?.token ?? "");
  const [host, setHost] = useState(existing?.host ?? DEFAULT_CONNECTION.host);
  const [maxRetries, setMaxRetries] = useState(existing?.maxRetries ?? DEFAULT_CONNECTION.maxRetries);
  const [baseDelay, setBaseDelay] = useState(existing?.baseDelay ?? DEFAULT_CONNECTION.baseDelay);
  const [advanced, setAdvanced] = useState(false);

  // Direct-to-NovelAI vs. a proxied host changes both the copy and where credentials travel.
  const isDirect = (host.trim() || DEFAULT_CONNECTION.host) === DEFAULT_CONNECTION.host;

  const submit = () => {
    if (!token.trim()) {
      toast.error(isDirect ? "Please enter your NovelAI API token" : "Please enter your access key");
      return;
    }
    connect({ token: token.trim(), host: host.trim() || DEFAULT_CONNECTION.host, maxRetries, baseDelay });
    toast.success(isDirect ? "Connected to NovelAI" : "Connected");
  };

  return (
    <Modal
      open={show}
      dismissible={connected}
      onClose={() => setUI({ showConnect: false })}
      ariaLabel="Welcome to NyaNovel — connect to start generating"
      className="max-w-md"
    >
      <div className="mb-5 flex flex-col items-center text-center">
        <span
          className="mb-3 flex size-12 items-center justify-center rounded-[14px] text-[22px] font-black text-on-accent shadow-[var(--glow-accent)]"
          style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          aria-hidden
        >
          N
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[21px] font-bold tracking-[-0.02em] text-fg">
          Welcome to NyaNovel
        </h2>
        {/* The destination is user-configurable, so the privacy claim has to follow it. Saying
            "straight to NovelAI" while Host URL points at a proxy would be a false statement about
            where the key and every prompt actually go. */}
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
          {isDirect ? (
            <>
              Paste your NovelAI token to start. It&apos;s stored only in this browser and sent straight
              to NovelAI — never to us.
            </>
          ) : (
            <>
              Paste your access key to start. It&apos;s stored only in this browser and sent, along with
              your prompts, to the host you&apos;ve configured below.
            </>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="nai-token">{isDirect ? "NovelAI API token" : "Access key"}</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="nai-token"
              type="password"
              autoComplete="off"
              placeholder={isDirect ? "pst-..." : "your access key"}
              className="pl-9 font-[family-name:var(--font-mono)] text-[13px]"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="self-start text-[12.5px] font-semibold text-muted transition-colors hover:text-fg-2"
        >
          {advanced ? "− Hide" : "+ Advanced"} connection settings
        </button>

        {advanced && (
          <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-soft bg-surface-2 p-4">
            <div>
              <Label htmlFor="nai-host">Host URL</Label>
              <Input id="nai-host" value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nai-retries">Max retries</Label>
                <NumberInput
                  id="nai-retries"
                  min={0}
                  max={10}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="nai-delay">Base delay (ms)</Label>
                <NumberInput
                  id="nai-delay"
                  min={500}
                  step={500}
                  value={baseDelay}
                  onChange={(e) => setBaseDelay(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        <Button onClick={submit} className="mt-1 w-full">
          {connected ? "Update connection" : "Connect"}
        </Button>
      </div>
    </Modal>
  );
}
