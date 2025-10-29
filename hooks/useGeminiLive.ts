import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Status, Transcription, Direction } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';

// Constants for audio processing
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

/**
 * Resamples a Float32Array audio buffer from an input sample rate to an output sample rate.
 * This is a basic implementation that averages samples, acting as a simple low-pass filter.
 * @param inputBuffer The audio data to resample.
 * @param inputSampleRate The original sample rate of the audio data.
 * @param outputSampleRate The target sample rate.
 * @returns A new Float32Array containing the resampled audio data.
 */
const resampleBuffer = (inputBuffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array => {
    if (inputSampleRate === outputSampleRate) {
        return inputBuffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(inputBuffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < newLength) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
            accum += inputBuffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
};


export const useGeminiLive = () => {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [transcriptionLog, setTranscriptionLog] = useState<Transcription[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
        }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputSourcesRef.current.forEach(source => source.stop());
      outputSourcesRef.current.clear();
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    nextStartTimeRef.current = 0;
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    setStatus(Status.IDLE);
  }, []);

  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    if (message.error) {
        setError(message.error.message);
        setStatus(Status.ERROR);
        await stopSession();
        return;
    }

    let hasInputUpdate = false;
    let hasOutputUpdate = false;

    if (message.serverContent?.inputTranscription) {
        currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
        hasInputUpdate = true;
    }
    if (message.serverContent?.outputTranscription) {
        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
        hasOutputUpdate = true;
    }
    
    if (hasInputUpdate || hasOutputUpdate) {
        setTranscriptionLog(prev => {
            const newLog = [...prev];
            
            if (hasInputUpdate) {
                const lastEntry = newLog[newLog.length - 1];
                if (lastEntry?.speaker === 'user' && lastEntry.isPartial) {
                    lastEntry.text = currentInputTranscriptionRef.current;
                } else {
                    newLog.push({ speaker: 'user', text: currentInputTranscriptionRef.current, isPartial: true });
                }
            }

            if (hasOutputUpdate) {
                const lastEntry = newLog[newLog.length - 1];
                if (lastEntry?.speaker === 'model' && lastEntry.isPartial) {
                    lastEntry.text = currentOutputTranscriptionRef.current;
                } else {
                    newLog.push({ speaker: 'model', text: currentOutputTranscriptionRef.current, isPartial: true });
                }
            }
            return newLog;
        });
    }

    if (message.serverContent?.turnComplete) {
        setTranscriptionLog(prev => prev.map(entry => ({...entry, isPartial: false})));
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
    }

    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData && outputAudioContextRef.current) {
      try {
        const outputAudioContext = outputAudioContextRef.current;
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
        const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, OUTPUT_SAMPLE_RATE, 1);
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        
        source.addEventListener('ended', () => {
          outputSourcesRef.current.delete(source);
        });
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        outputSourcesRef.current.add(source);
      } catch (e) {
        console.error("Error processing audio:", e);
        setError("Failed to play back audio.");
        setStatus(Status.ERROR);
      }
    }

    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
      outputSourcesRef.current.forEach(source => source.stop());
      outputSourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  }, [stopSession]);


  const startSession = useCallback(async (direction: Direction) => {
    setError(null);
    setTranscriptionLog([]);
    setStatus(Status.CONNECTING);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      const systemInstruction = direction === 'id_to_jp'
        ? 'You are a real-time translator. Translate any Indonesian speech you hear into Japanese and speak it out loud. Only respond with the Japanese translation. Do not add any conversational filler.'
        : 'You are a real-time translator. Translate any Japanese speech you hear into Indonesian and speak it out loud. Only respond with the Indonesian translation. Do not add any conversational filler.';

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!mediaStreamRef.current || !inputAudioContextRef.current) return;
            setStatus(Status.LISTENING);

            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const inputSampleRate = audioProcessingEvent.inputBuffer.sampleRate;
              
              const resampledData = resampleBuffer(inputData, inputSampleRate, INPUT_SAMPLE_RATE);
              
              const pcmBlob: Blob = {
                  data: encode(new Uint8Array(new Int16Array(resampledData.map(f => f * 32768)).buffer)),
                  mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
              };
              
              if (sessionPromiseRef.current) {
                  sessionPromiseRef.current.then((session) => {
                      session.sendRealtimeInput({ media: pcmBlob });
                  }).catch(e => {
                      console.error("Failed to send audio data:", e);
                      setError("Connection lost. Please restart.");
                      setStatus(Status.ERROR);
                  });
              }
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setError(`Session error: ${e.message}`);
            setStatus(Status.ERROR);
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
      });

      await sessionPromiseRef.current;

    } catch (e: any) {
      console.error("Failed to start session:", e);
      setError(`Failed to start session: ${e.message}`);
      setStatus(Status.ERROR);
      await stopSession();
    }
  }, [handleMessage, stopSession]);

  return { status, transcriptionLog, error, startSession, stopSession };
};
