import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceInputOptions {
  /** Called with interim transcript while speaking */
  onInterim?: (text: string) => void;
  /** Called with final transcript when done */
  onResult?: (text: string) => void;
  /** Language code, default "en-US" */
  lang?: string;
  /** Continuous mode keeps listening after pauses */
  continuous?: boolean;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceInput({
  onInterim,
  onResult,
  lang = "en-US",
  continuous = true,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const callbacksRef = useRef({ onInterim, onResult });

  callbacksRef.current = { onInterim, onResult };

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    if (!isSupported) return null;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (interimText) {
        setTranscript(interimText);
        callbacksRef.current.onInterim?.(interimText);
      }

      if (finalText) {
        setTranscript(finalText);
        callbacksRef.current.onResult?.(finalText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [isSupported, continuous, lang]);

  const startListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) return;
    try {
      recognition.start();
      setIsListening(true);
      setTranscript("");
    } catch {
      // Already started
    }
  }, [getRecognition]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}
