
/**
 * @see https://webaudio.github.io/web-speech-api
 */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  if (!recognition) {
    return;
  }

  let active = false;

  // let tabId: number | undefined;
  // chrome.tabs.getCurrent((tab) => {
  //   tabId = tab?.id;
  // });

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  const startSpeechRecognition = () => recognition.start();
  const stopSpeechRecognition = () => recognition.stop();

  recognition.onspeechstart = event => console.log("speech started");
  recognition.onspeechend = event => stopSpeechRecognition();
  recognition.onend = function(event) {
    console.log("speech ended, active?", active, ", recognition.continuous?", recognition.continuous);
    if (active && recognition.continuous) {
      startSpeechRecognition()
    } else {
      stopSpeechRecognition()
    }
  }

  const handleStartSpeechRecognition = async (
    sendResponse: (response: string) => void,
    onInterimResult?: (interimResult: string) => void,
  ) => {
    let promisedTranscript = new Promise<string>((resolve, reject) => {
      recognition.onresult = event => {
        let interim_transcript = '';
        let final_transcript = '';

        for (var i = event.resultIndex; i < event.results.length; ++i) {
          // Verify if the recognized text is the last with the isFinal property
          if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
            console.info('final_transcript', final_transcript);
            resolve(final_transcript);
          } else {
            interim_transcript += event.results[i][0].transcript;
            console.info('interim_transcript', interim_transcript);
            onInterimResult?.(interim_transcript);
          }
        }
      }

      recognition.onerror = event => {
        console.log("error", event.error)
        if(event.error === 'not-allowed'){
          const errorMessage = "AudioCapture permission has been blocked because of a Feature Policy applied to the current document. See https://goo.gl/EuHzyv for more details.";
          chrome.runtime.sendMessage({
            action: 'pageError',
            // tabId,
            error: errorMessage
          })
          // isStopButtonClicked = true;
          recognition.stop();
          reject(errorMessage);
        } else {
          reject(event.error);
        }
      }
    });

    startSpeechRecognition();

    return promisedTranscript.then((transcript) => {
      sendResponse(transcript);
    });
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if(request.action === "startSpeechRecognition") {
      active = true;
      recognition.continuous = request.continuous;
      recognition.interimResults = request.interimResults;
      const onInterimResult = request.interimResults === undefined ? undefined : (result: string) => {
        chrome.runtime.sendMessage({
          action: 'interimSpeechRecognition',
          result
        })
      };
      return handleStartSpeechRecognition(sendResponse, onInterimResult);
    } else if(request.action === "stopSpeechRecognition") {
      active = false;
      stopSpeechRecognition();
    }
  });
}

initSpeechRecognition();
