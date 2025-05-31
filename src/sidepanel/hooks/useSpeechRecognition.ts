import { useEffect } from "react";

export const useSpeechRecognition = (
  tabId: number | null,
  continuous: boolean = false,
  oninterimResults?: (result: string) => void,
) => {
  const recognitionSupported = ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!oninterimResults) return;
    const onMessage = (message: { action: string, result: string }) => {
      if (message.action === "speech:interimResult") {
        oninterimResults(message.result);
      }
    }
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    }
  }, [oninterimResults]);

  const startSpeechRecognition = () => {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
      action: 'speech:start',
      continuous,
      interimResults: oninterimResults !== undefined,
    // }, (response) => {
    //   if (chrome.runtime.lastError) {
    //     console.error("startSpeechRecognition error", chrome.runtime.lastError);
    //   }
    //   console.log("startSpeechRecognition response", response);
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
