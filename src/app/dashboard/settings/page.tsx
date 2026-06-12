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

type Config = {
  bot_name: string;
  welcome_message: string;
  personality: string;
  escalation_rules: string;
  suggested_questions: string[];
};

const BUILT_IN_PERSONALITIES = ["professional", "friendly", "technical"];

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
