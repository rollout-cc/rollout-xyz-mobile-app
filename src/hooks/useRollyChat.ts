import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useQueryClient } from "@tanstack/react-query";

export type RollyMessageContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

export type RollyMessage = {
  role: "user" | "assistant";
  content: RollyMessageContent;
  /** Optional image data URI for display in user bubbles */
  imagePreview?: string;
};

export type RollyToolAction = { tool: string; success: boolean; message: string; data?: any };

/** Extract plain text from a message content field */
export function getMessageText(content: RollyMessageContent): string {
  if (typeof content === "string") return content;
  const textPart = content.find((p) => p.type === "text");
  return textPart && "text" in textPart ? textPart.text : "";
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rolly-chat`;

export function useRollyChat(planMode: boolean = false) {
  const [messages, setMessages] = useState<RollyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastActions, setLastActions] = useState<RollyToolAction[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { selectedTeamId } = useSelectedTeam();
  const queryClient = useQueryClient();

  const send = useCallback(async (input: string, imageData?: { base64: string; mimeType: string }) => {
    const text = input || (imageData ? "What's in this image?" : "");
    if (!text && !imageData) return;

    // Prefix with plan mode hint if active (hidden from display)
    const textForApi = planMode ? `[PLAN MODE] ${text}` : text;

    // Build the API content — multimodal array if image is attached
    let apiContent: RollyMessageContent;
    if (imageData) {
      apiContent = [
        { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } },
        { type: "text", text: textForApi },
      ];
    } else {
      apiContent = textForApi;
    }

    const userMsg: RollyMessage = { role: "user", content: apiContent };

    // Display version — show text without plan prefix, plus image preview
    const displayMsg: RollyMessage = {
      role: "user",
      content: text,
      imagePreview: imageData ? `data:${imageData.mimeType};base64,${imageData.base64}` : undefined,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(prev => [...prev, displayMsg]);
    setIsLoading(true);
    setLastActions([]);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Please log in to use Rolly." }]);
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: updatedMessages, team_id: selectedTeamId }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (errData.error === "rolly_limit_reached") {
          setMessages(prev => [...prev, { role: "assistant", content: "🔒 You've reached your Rolly message limit for this month. Please try again next month or contact support if you believe this is an error." }]);
          setIsLoading(false);
          return;
        }
        const errMsg = errData.error || `Error ${resp.status}`;
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${errMsg}` }]);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === "tool_actions") {
              setLastActions(parsed.actions);
              queryClient.invalidateQueries({ queryKey: ["rolly-workspace-tasks"] });
              queryClient.invalidateQueries({ queryKey: ["rolly-workspace-artists"] });
              queryClient.invalidateQueries({ queryKey: ["rolly-workspace-budgets"] });
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "tool_actions") {
              setLastActions(parsed.actions);
              queryClient.invalidateQueries({ queryKey: ["rolly-workspace-tasks"] });
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch { /* ignore partial leftovers */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("ROLLY stream error:", e);
        setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Something went wrong. Please try again." }]);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, selectedTeamId, queryClient, planMode]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setLastActions([]);
  }, []);

  return { messages, isLoading, send, stop, clear, lastActions };
}
