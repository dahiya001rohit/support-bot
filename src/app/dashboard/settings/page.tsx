"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Theme = {
  primary?: string;
  surface?: string;
  userBubble?: string;
  position?: "left" | "right";
  bubbleIcon?: string;
  fontSize?: "small" | "medium" | "large";
  mode?: "dark" | "light";
};

type Config = {
  bot_name: string;
  welcome_message: string;
  personality: string;
  escalation_rules: string;
  suggested_questions: string[];
  theme?: Theme;
};

const DEFAULT_THEME: Theme = {
  primary: "#5e6ad2",
  surface: "#1a1b1e",
  userBubble: "#5e6ad2",
  position: "right",
  bubbleIcon: "💬",
  fontSize: "medium",
  mode: "dark",
};

const THEME_PRESETS = {
  "Indigo Dark": {
    primary: "#5e6ad2",
    surface: "#1a1b1e",
    userBubble: "#5e6ad2",
    mode: "dark" as const,
  },
  "Emerald Dark": {
    primary: "#10b981",
    surface: "#1a1b1e",
    userBubble: "#10b981",
    mode: "dark" as const,
  },
  "Light Minimal": {
    primary: "#3b82f6",
    surface: "#ffffff",
    userBubble: "#3b82f6",
    mode: "light" as const,
  },
  "Slate": {
    primary: "#64748b",
    surface: "#f1f5f9",
    userBubble: "#64748b",
    mode: "light" as const,
  },
  "Rose": {
    primary: "#f43f5e",
    surface: "#1a1b1e",
    userBubble: "#f43f5e",
    mode: "dark" as const,
  },
};

const BUILT_IN_PERSONALITIES = ["professional", "friendly", "technical"];

const FONT_SIZES = { small: "12.5px", medium: "13.5px", large: "15px" };

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return m
    ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`
    : "94,106,210";
}

interface WidgetPreviewProps {
  theme: Theme;
  botName: string;
}

function WidgetPreview({ theme, botName }: WidgetPreviewProps) {
  const t = { ...DEFAULT_THEME, ...theme };
  const light = t.mode === "light";
  const primaryRgb = hexToRgb(t.primary!);

  const vars = {
    "--sai-primary": t.primary,
    "--sai-primary-rgb": primaryRgb,
    "--sai-surface": t.surface,
    "--sai-user-bubble": t.userBubble || t.primary,
    "--sai-font": FONT_SIZES[t.fontSize as keyof typeof FONT_SIZES] || FONT_SIZES.medium,
    "--sai-bg": light ? "#f7f8fa" : "#0e0f11",
    "--sai-bot-bubble": light ? "#ffffff" : "#232428",
    "--sai-text": light ? "#1c1d1f" : "#e6e6e9",
    "--sai-text-dim": light ? "#6b6f76" : "#8a8f98",
    "--sai-text-faint": light ? "#9aa0a8" : "#62666d",
    "--sai-border": light ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.08)",
    "--sai-border-soft": light ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)",
    "--sai-input-bg": light ? "#ffffff" : "#0e0f11",
    "--sai-on-primary": "#ffffff",
  };

  return (
    <div
      className="relative rounded-lg border border-border h-[520px] overflow-hidden"
      style={{
        ...vars,
        backgroundColor: light ? "#f5f5f5" : "#1a1a1a",
      } as React.CSSProperties}
    >
      <style>{`
        .preview-canvas {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 12px;
        }
        .preview-bubble {
          position: absolute;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: var(--sai-surface);
          border: 1px solid var(--sai-border);
          color: var(--sai-text);
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,.5);
          cursor: pointer;
          transition: transform .15s ease, border-radius .2s ease;
          bottom: 12px;
          z-index: 10;
        }
        .preview-bubble:hover {
          transform: translateY(-2px);
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(0,0,0,.6);
        }
        .preview-bubble.left {
          left: 12px;
        }
        .preview-bubble.right {
          right: 12px;
        }
        .preview-window {
          position: relative;
          width: 348px;
          max-width: 100%;
          height: 496px;
          background: var(--sai-surface);
          border-radius: 12px;
          border: 1px solid var(--sai-border);
          box-shadow: 0 24px 48px rgba(0,0,0,.5), 0 0 0 1px var(--sai-border);
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          flex-shrink: 0;
        }
        .preview-header {
          background: var(--sai-surface);
          border-bottom: 1px solid var(--sai-border-soft);
          color: var(--sai-text);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        .preview-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--sai-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: var(--sai-on-primary);
        }
        .preview-header-name {
          font-weight: 600;
          font-size: 13.5px;
          color: var(--sai-text);
        }
        .preview-header-status {
          font-size: 11px;
          color: var(--sai-text-dim);
        }
        .preview-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          background: var(--sai-bg);
        }
        .preview-msg {
          max-width: 85%;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: var(--sai-font);
          line-height: 1.5;
        }
        .preview-msg.user {
          align-self: flex-end;
          background: var(--sai-user-bubble);
          color: var(--sai-on-primary);
          border-bottom-right-radius: 3px;
        }
        .preview-msg.bot {
          align-self: flex-start;
          background: var(--sai-bot-bubble);
          color: var(--sai-text);
          border: 1px solid var(--sai-border-soft);
          border-bottom-left-radius: 3px;
        }
        .preview-inputrow {
          display: flex;
          border-top: 1px solid var(--sai-border-soft);
          padding: 10px;
          gap: 7px;
          background: var(--sai-surface);
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .preview-input {
          flex: 1;
          border: 1px solid var(--sai-border);
          border-radius: 8px;
          padding: 8px 11px;
          font-size: 13.5px;
          background: var(--sai-input-bg);
          color: var(--sai-text);
          outline: none;
        }
        .preview-send {
          background: var(--sai-primary);
          color: var(--sai-on-primary);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          font-size: 14px;
        }
      `}</style>

      <div className="preview-canvas">
        <div
          className={`preview-bubble ${t.position === "left" ? "left" : "right"}`}
        >
          {t.bubbleIcon || DEFAULT_THEME.bubbleIcon}
        </div>

        <div className="preview-window">
          <div className="preview-header">
            <div className="preview-avatar">
              {(botName || "S")[0].toUpperCase()}
            </div>
            <div>
              <div className="preview-header-name">{botName || "Support"}</div>
              <div className="preview-header-status">● Online</div>
            </div>
          </div>
          <div className="preview-messages">
            <div className="preview-msg bot">Hello! How can I assist you?</div>
            <div className="preview-msg user">I have a question</div>
            <div className="preview-msg bot">Sure! I'd be happy to help.</div>
          </div>
          <div className="preview-inputrow">
            <input
              className="preview-input"
              placeholder="Type your message…"
              disabled
            />
            <button className="preview-send">➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botName, setBotName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [personality, setPersonality] = useState("professional");
  const [customPersonality, setCustomPersonality] = useState("");
  const [escalationRules, setEscalationRules] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Config) => {
        setBotName(data.bot_name ?? "");
        setWelcomeMessage(data.welcome_message ?? "");
        const p = data.personality ?? "professional";
        if (BUILT_IN_PERSONALITIES.includes(p)) {
          setPersonality(p);
        } else {
          setPersonality("custom");
          setCustomPersonality(p);
        }
        setEscalationRules(data.escalation_rules ?? "");
        setQuestions(data.suggested_questions ?? []);
        setTheme({ ...DEFAULT_THEME, ...(data.theme || {}) });
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const finalPersonality = personality === "custom" ? customPersonality : personality;
      const r = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_name: botName,
          welcome_message: welcomeMessage,
          personality: finalPersonality,
          escalation_rules: escalationRules,
          suggested_questions: questions,
          theme,
        }),
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? "Save failed"); }
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addQuestion() {
    const q = newQuestion.trim();
    if (!q || questions.length >= 6) return;
    setQuestions((prev) => [...prev, q]);
    setNewQuestion("");
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-48 mt-1" />
        </div>
        <Card className="border border-border">
          <CardContent className="space-y-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure your AI support bot behavior
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
        <Card className="border border-border">
          <CardHeader className="pb-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Bot Identity
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bot-name" className="text-[13px]">Bot name</Label>
              <Input
                id="bot-name"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. SupportBot"
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="welcome-message" className="text-[13px]">Welcome message</Label>
              <Input
                id="welcome-message"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Hi! How can I help you today?"
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="personality" className="text-[13px]">Personality</Label>
              <Select value={personality} onValueChange={setPersonality}>
                <SelectTrigger id="personality" className="w-full h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {personality === "custom" && (
                <Input
                  className="mt-1.5 h-8 text-[13px]"
                  value={customPersonality}
                  onChange={(e) => setCustomPersonality(e.target.value)}
                  placeholder="Describe the bot's personality…"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Escalation Rules
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="escalation-rules" className="text-[13px]">
                When should the bot escalate to a human?
              </Label>
              <Textarea
                id="escalation-rules"
                value={escalationRules}
                onChange={(e) => setEscalationRules(e.target.value)}
                placeholder="Escalate when the customer is frustrated, mentions billing, or asks to speak to a human…"
                rows={3}
                className="text-[13px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Suggested Questions
              </span>
              <span className="text-[12px] text-muted-foreground">{questions.length}/6</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {questions.map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <span className="flex-1 text-[13px]">{q}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {questions.length < 6 && (
              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Add a suggested question…"
                  className="h-8 text-[13px]"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={addQuestion}
                  disabled={!newQuestion.trim()}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">
              Appear as quick-reply chips in the chat widget. Max 6.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Widget Appearance
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label className="text-[13px] font-medium mb-2 block">Theme Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(THEME_PRESETS).map(([name, preset]) => (
                      <Button
                        key={name}
                        type="button"
                        variant={
                          theme.primary === preset.primary &&
                          theme.mode === preset.mode
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className="text-[12px] h-7"
                        onClick={() =>
                          setTheme((prev) => ({
                            ...prev,
                            ...preset,
                          }))
                        }
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-color" className="text-[13px]">
                    Primary Color
                  </Label>
                  <div className="flex gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={theme.primary || DEFAULT_THEME.primary}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          primary: e.target.value,
                        }))
                      }
                      className="w-10 h-8 cursor-pointer rounded border"
                    />
                    <Input
                      type="text"
                      value={theme.primary || DEFAULT_THEME.primary}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          primary: e.target.value,
                        }))
                      }
                      className="flex-1 h-8 text-[13px]"
                      placeholder="#5e6ad2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surface-color" className="text-[13px]">
                    Surface Color
                  </Label>
                  <div className="flex gap-2">
                    <input
                      id="surface-color"
                      type="color"
                      value={theme.surface || DEFAULT_THEME.surface}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          surface: e.target.value,
                        }))
                      }
                      className="w-10 h-8 cursor-pointer rounded border"
                    />
                    <Input
                      type="text"
                      value={theme.surface || DEFAULT_THEME.surface}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          surface: e.target.value,
                        }))
                      }
                      className="flex-1 h-8 text-[13px]"
                      placeholder="#1a1b1e"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-bubble-color" className="text-[13px]">
                    User Bubble Color
                  </Label>
                  <div className="flex gap-2">
                    <input
                      id="user-bubble-color"
                      type="color"
                      value={theme.userBubble || DEFAULT_THEME.userBubble}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          userBubble: e.target.value,
                        }))
                      }
                      className="w-10 h-8 cursor-pointer rounded border"
                    />
                    <Input
                      type="text"
                      value={theme.userBubble || DEFAULT_THEME.userBubble}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          userBubble: e.target.value,
                        }))
                      }
                      className="flex-1 h-8 text-[13px]"
                      placeholder="#5e6ad2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]">Position</Label>
                  <div className="flex gap-2">
                    {["left", "right"].map((pos) => (
                      <Button
                        key={pos}
                        type="button"
                        variant={theme.position === pos ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-[12px]"
                        onClick={() =>
                          setTheme((prev) => ({
                            ...prev,
                            position: pos as "left" | "right",
                          }))
                        }
                      >
                        {pos === "left" ? "🔸 Left" : "🔹 Right"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]">Font Size</Label>
                  <div className="flex gap-2">
                    {["small", "medium", "large"].map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={theme.fontSize === size ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-[12px]"
                        onClick={() =>
                          setTheme((prev) => ({
                            ...prev,
                            fontSize: size as "small" | "medium" | "large",
                          }))
                        }
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]">Mode</Label>
                  <div className="flex gap-2">
                    {["dark", "light"].map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={theme.mode === mode ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-[12px]"
                        onClick={() =>
                          setTheme((prev) => ({
                            ...prev,
                            mode: mode as "dark" | "light",
                          }))
                        }
                      >
                        {mode === "dark" ? "🌙 Dark" : "☀️ Light"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bubble-icon" className="text-[13px]">
                    Bubble Icon
                  </Label>
                  <Input
                    id="bubble-icon"
                    type="text"
                    value={theme.bubbleIcon || DEFAULT_THEME.bubbleIcon}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        bubbleIcon: e.target.value,
                      }))
                    }
                    maxLength={2}
                    className="h-8 text-[13px]"
                    placeholder="💬"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Emoji or 1-2 characters
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[12px]"
                  onClick={() => setTheme(DEFAULT_THEME)}
                >
                  Reset to Default
                </Button>
              </div>

              <WidgetPreview theme={theme} botName={botName} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="sm">
            {saving ? (
              <><Loader2 className="size-3.5 animate-spin" /> Saving…</>
            ) : (
              <><Save className="size-3.5" /> Save changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
