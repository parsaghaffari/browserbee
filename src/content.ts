
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
  let lastTranscript = '';
  let promisedTranscript: Promise<string> = Promise.resolve(lastTranscript);

  // let tabId: number | undefined;
  // chrome.tabs.getCurrent((tab) => {
  //   tabId = tab?.id;
  // });

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  const startSpeechRecognition = () => {
    active = true;
    recognition.start();
  };
  const stopSpeechRecognition = () => {
    active = false;
    recognition.stop();
  }

  // recognition.onspeechstart = event => console.log("speech started");
  recognition.onspeechend = event => {
    console.info("Speech has stopped being detected, active?", active, ", recognition.continuous?", recognition.continuous);
    // stopSpeechRecognition();
  }


  const handleStartSpeechRecognition = async (
    onInterimResult?: (interimResult: string) => void,
  ) => {
    promisedTranscript = new Promise<string>((resolve, reject) => {
      console.info('creating promisedTranscript');

      recognition.onresult = event => {
        let interim_transcript = lastTranscript; // ? lastTranscript + ' ' : '';
        let final_transcript = interim_transcript;

        // console.info('event.results', event.results);

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          // Verify if the recognized text is the last with the isFinal property
          if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
            lastTranscript = final_transcript;
            if (recognition.continuous) {
              // console.info('final_transcript', final_transcript);
              lastTranscript += '. ';
            } else {
              // console.info('resolving final_transcript', final_transcript);
              // resolve(final_transcript);
            }
          } else {
            interim_transcript += event.results[i][0].transcript;
            onInterimResult?.(interim_transcript);
          }
        }
      }

      recognition.onend = () => {
        console.info('SpeechRecognition.onend, continuous?', recognition.continuous, ', active?', active, ', lastTranscript', lastTranscript);
        // if (active) {
        //   // stop was not requested, restart
        //   lastTranscript += '. ';
        // }

        lastTranscript = lastTranscript.trim();
        if (lastTranscript) {
          chrome.runtime.sendMessage({
            action: 'speech:result',
            result: lastTranscript
          })

          lastTranscript = '';
        }

        if (!recognition.continuous || !active) {
          // console.info('SpeechRecognition.onend resolving', lastTranscript);
          // resolve(lastTranscript.trim());
        }
        if (recognition.continuous && active) {
          // Chrome emits `end` after about 5s of silence, restart recognition
          startSpeechRecognition();
        } else {
          chrome.runtime.sendMessage({
            action: 'speech:end',
          })
        }
      }

      recognition.onerror = event => {
        console.log("error", event.error)
        if(event.error === 'not-allowed'){
          const errorMessage = "AudioCapture permission has been blocked because of a Feature Policy applied to the current document. See https://goo.gl/EuHzyv for more details.";
          chrome.runtime.sendMessage({
            action: 'pageError',
            error: errorMessage
          })
          recognition.stop();
          reject(errorMessage);
        } else {
          reject(event.error);
        }
      }
    });

    startSpeechRecognition();
    return !recognition.continuous;
  }

  const handleProcessSpeechRecognition = (sendResponse: (response: string) => void,) => {
    return promisedTranscript.then((transcript) => {
      console.info('processSpeechRecognition transcript -> sendResponse', transcript);
      sendResponse(transcript);
    });
  }

  console.info('listening for startSpeechRecognition...');
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "speech:start") {
      // console.info('startSpeechRecognition', request.continuous, request.interimResults);
      active = true;
      lastTranscript = '';
      recognition.continuous = request.continuous;
      recognition.interimResults = request.interimResults;
      const onInterimResult = request.interimResults === undefined ? undefined : (result: string) => {
        chrome.runtime.sendMessage({
          action: 'speech:interimResult',
          result
        })
      };
      return handleStartSpeechRecognition(onInterimResult);
    } else {
      stopSpeechRecognition();

      if (request.action === "speech:process") {
        handleProcessSpeechRecognition(sendResponse);
        return true;
      }
    }
  });
}

initSpeechRecognition();
