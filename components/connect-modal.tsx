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
import { BrandLogo } from "@/components/brand-logo";

/**
 * Hostname for display. The raw field is echoed back if it isn't a parseable URL — this renders on
 * every keystroke while the user edits Host URL, and a bare `new URL()` would throw on the first
 * incomplete one and take the whole dialog down with it.
 */
function hostLabel(raw: string): string {
  const value = raw.trim() || DEFAULT_CONNECTION.host;
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

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
  const [rejected, setRejected] = useState(false);
  const verifying = useStore((s) => s.connectionStatus === "verifying");

  /**
   * Re-seed the form every time the dialog opens.
   *
   * This component is mounted for the life of the app (Studio renders it unconditionally and Modal
   * handles visibility), so the useState initialisers above run exactly once — during the first
   * render, while `init()` has not yet restored the saved connection and `existing` is still null.
   * They captured an empty token and the default host and never re-ran, so a returning user opened
   * a blank form and reasonably concluded their key had been lost. It never was: it was in
   * localStorage and on the live client the whole time.
   *
   * Derived during render rather than in an effect, matching useDelayedUnmount — an effect would
   * paint one frame of stale fields before correcting them.
   */
  const [prevShow, setPrevShow] = useState(show);
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) {
      setToken(existing?.token ?? "");
      setHost(existing?.host ?? DEFAULT_CONNECTION.host);
      setMaxRetries(existing?.maxRetries ?? DEFAULT_CONNECTION.maxRetries);
      setBaseDelay(existing?.baseDelay ?? DEFAULT_CONNECTION.baseDelay);
      setRejected(false);
      // Expand Advanced when the saved host isn't the default, so a configured proxy is visible
      // instead of hidden behind a collapsed toggle that looks like it holds nothing.
      setAdvanced(Boolean(existing) && existing?.host !== DEFAULT_CONNECTION.host);
    }
  }

  // Direct-to-NovelAI vs. a proxied host changes both the copy and where credentials travel.
  const isDirect = (host.trim() || DEFAULT_CONNECTION.host) === DEFAULT_CONNECTION.host;

  const submit = async () => {
    if (!token.trim()) {
      setRejected(false);
      toast.error(isDirect ? "Please enter your NovelAI API token" : "Please enter your access key");
      return;
    }
    setRejected(false);
    const ok = await connect({
      token: token.trim(),
      host: host.trim() || DEFAULT_CONNECTION.host,
      maxRetries,
      baseDelay,
    });
    // The failure belongs next to the field you have to fix, not in a corner toast that fades
    // while you're still looking at the input.
    if (!ok) {
      setRejected(true);
      return;
    }
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
        <BrandLogo variant="mark" className="mb-3 size-14" />
        <h2 className="font-[family-name:var(--font-display)] text-[21px] font-bold tracking-[-0.02em] text-fg">
          {connected ? "Connection settings" : "Welcome to NyaNovel"}
        </h2>
        {/* The destination is user-configurable, so the privacy claim has to follow it. Saying
            "straight to NovelAI" while Host URL points at a proxy would be a false statement about
            where the key and every prompt actually go.

            Returning users get different copy entirely: telling someone who is already connected to
            "paste your token to start" implies the saved one is gone and invites them to hunt down
            a credential they don't need. */}
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
          {connected ? (
            <>
              Your {isDirect ? "token" : "access key"} is saved in this browser and already in use.
              Edit it below only if you want to change it.
            </>
          ) : isDirect ? (
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

        {connected && (
          <span className="mt-3 flex max-w-full items-center gap-2 rounded-[var(--radius-pill)] border border-border-soft bg-surface-2 px-2.5 py-1 text-[11.5px] text-fg-2">
            <span className="size-2 shrink-0 rounded-full bg-ok" style={{ boxShadow: "0 0 8px var(--ok)" }} />
            <span className="truncate font-[family-name:var(--font-mono)]">
              {isDirect ? "NovelAI" : hostLabel(host)}
            </span>
          </span>
        )}
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
              aria-invalid={rejected || undefined}
              aria-describedby={rejected ? "nai-token-error" : undefined}
              onChange={(e) => {
                setToken(e.target.value);
                if (rejected) setRejected(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
          {rejected && (
            <p id="nai-token-error" role="alert" className="mt-1.5 text-[12.5px] text-danger">
              {isDirect
                ? "NovelAI rejected that token. Copy it again from your account settings — it starts with pst-."
                : "The host rejected that access key. Check the key and the host URL below."}
            </p>
          )}
        </div>

        {/* The modal used to demand a token without ever saying where one comes from — a dead end
            for anyone who hadn't already found it. */}
        {isDirect && !rejected && (
          <p className="-mt-1 text-[12px] leading-relaxed text-muted">
            Find yours in NovelAI under{" "}
            <span className="text-fg-2">Account → Get Persistent API Token</span>.
          </p>
        )}

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

        <Button onClick={() => void submit()} disabled={verifying} aria-busy={verifying} className="mt-1 w-full">
          {verifying ? (
            <>
              <span
                className="motion-keep size-4 rounded-full border-2 border-current/30 border-t-current"
                style={{ animation: "spin 0.7s linear infinite" }}
                aria-hidden
              />
              Checking key…
            </>
          ) : connected ? (
            "Update connection"
          ) : (
            "Connect"
          )}
        </Button>
      </div>
    </Modal>
  );
}
