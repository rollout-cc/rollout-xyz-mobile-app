import ReactMarkdown from "react-markdown";
import type { RollyMessage as RollyMessageType } from "@/hooks/useRollyChat";
import { cn } from "@/lib/utils";

interface Props {
  message: RollyMessageType;
  isStreaming?: boolean;
}

export function RollyMessage({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          R
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-3 w-1.5 bg-foreground/60 rounded-sm animate-pulse ml-0.5 align-baseline" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
