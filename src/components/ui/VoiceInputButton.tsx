import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  size?: "sm" | "icon";
  className?: string;
}

export function VoiceInputButton({
  isListening,
  isSupported,
  onClick,
  size = "icon",
  className,
}: VoiceInputButtonProps) {
  if (!isSupported) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size}
          className={cn(
            "shrink-0 transition-colors",
            size === "icon" ? "h-9 w-9" : "h-7 w-7 p-0",
            isListening
              ? "text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20"
              : "text-muted-foreground",
            className
          )}
          onClick={onClick}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? (
            <span className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/30 animate-ping" />
              <MicOff className={size === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
            </span>
          ) : (
            <Mic className={size === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isListening ? "Stop listening" : "Voice input"}
      </TooltipContent>
    </Tooltip>
  );
}
