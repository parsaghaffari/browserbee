import { useEffect } from "react";

export const useSpeechRecognition = (
  tabId: number | null,
  continuous: boolean = false,
  oninterimResults?: (result: string) => void,
) => {
  const recognitionSupported = ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!oninterimResults) return;
    chrome.runtime.onMessage.addListener((request) => {
      if(request.action === "interimSpeechRecognition") {
        oninterimResults(request.result);
      }
    });
  }, [oninterimResults]);

  const startSpeechRecognition = () => {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
      action: 'startSpeechRecognition',
      continuous,
      interimResults: oninterimResults !== undefined,
    });
  };

  const processSpeechRecognition = async (): Promise<string> => {
    if (!tabId) return '';
    const response = await chrome.tabs.sendMessage<any, string>(tabId, {
      action: 'submitSpeechRecognition'
    });
    console.log("Speech rec response", response);
    return response;
  };

  const cancelSpeechRecognition = () => {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
      action: 'cancelSpeechRecognition'
    });
  };

  return {
    recognitionSupported,
    startSpeechRecognition,
    processSpeechRecognition,
    cancelSpeechRecognition,
  };
};
