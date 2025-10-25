import { useEffect } from "react";

export const useSpeechRecognition = (
  tabId: number | null,
  continuous: boolean = false,
  {
    onInterimResult,
    onSpeechResult,
    onSpeechEnd,
  }: {
    onInterimResult?: (result: string) => void,
    onSpeechResult?: (result: string) => void,
    onSpeechEnd?: () => void,
  }
) => {
  const recognitionSupported = ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!onInterimResult) return;
    const onMessage = (message: { action: string, result: string }) => {
      switch (message.action) {
        case "speech:interimResult":
          onInterimResult(message.result);
          break;
        case "speech:result":
          onSpeechResult?.(message.result);
          break;
        case "speech:end":
          onSpeechEnd?.();
          break;
      }
    }
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    }
  }, [onInterimResult]);

  const startSpeechRecognition = () => {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
      action: 'speech:start',
      continuous,
      interimResults: onInterimResult !== undefined,
    });
  };

  const processSpeechRecognition = async (): Promise<string> => {
    if (!tabId) return '';
    try {
      const response = await chrome.tabs.sendMessage<any, string>(tabId, {
        action: 'speech:process'
      });
      console.log("processSpeechRecognition response", response);
      return response;
    } catch (error) {
      console.error("processSpeechRecognition error", error);
      return '';
    }
  };

  const cancelSpeechRecognition = () => {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
      action: 'speech:cancel'
    });
  };

  return {
    recognitionSupported,
    startSpeechRecognition,
    processSpeechRecognition,
    cancelSpeechRecognition,
  };
};
