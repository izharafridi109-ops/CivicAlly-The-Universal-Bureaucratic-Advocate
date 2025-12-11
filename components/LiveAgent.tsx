import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createBlob, decodeAudioData, decode, blobToBase64 } from '../utils/audio-utils';
import { AgentState, ClaimDraft, LogMessage } from '../types';
import ClaimForm from './ClaimForm';

// Initialize Gemini
// Note: In a real app, never expose API keys on the client.
// This is for hackathon/demo purposes as per instructions.
const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Define LiveSession type locally as it is not exported by the SDK
type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

// System Instruction simulating the "Expert Caseworker" persona
const SYSTEM_INSTRUCTION = `You are CivicAlly, a compassionate, rigorous, and expert Social Protection Caseworker. 
Your Goal: Guide the user to successfully claim Unclaimed Bank Deposits (India).
Your Persona: Empathetic, Plain Language, Rigorous.
Operational Rules:
1. Speak clearly and simply.
2. Ask one question at a time.
3. If the user provides a document image, analyze it to extract Name, Account Number, or Bank Name.
4. Use the "updateClaimDraft" tool to update the claim form whenever you get new information.
5. If a death certificate is shown, set the "deceasedName".
6. If a passbook is shown, set "bankName" and "accountNumber".
7. Be proactive: "I see you uploaded a passbook. I've updated the bank details."
`;

// Tool Definition
const updateClaimDraftFunction: FunctionDeclaration = {
  name: 'updateClaimDraft',
  description: 'Update the fields of the unclaimed deposit claim affidavit based on user input or document analysis.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      claimantName: { type: Type.STRING, description: 'Name of the person claiming the funds' },
      deceasedName: { type: Type.STRING, description: 'Name of the deceased account holder (if applicable)' },
      relationship: { type: Type.STRING, description: 'Relationship of claimant to deceased (e.g., Son, Wife)' },
      bankName: { type: Type.STRING, description: 'Name of the bank holding the funds' },
      accountNumber: { type: Type.STRING, description: 'Account number if available' },
      status: { type: Type.STRING, enum: ['draft', 'ready'], description: 'Set to ready if all fields are filled' }
    },
  },
};

const LiveAgent: React.FC = () => {
  // State
  const [state, setState] = useState<AgentState>(AgentState.DISCONNECTED);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [claimDraft, setClaimDraft] = useState<ClaimDraft>({
    claimantName: '',
    deceasedName: '',
    relationship: '',
    bankName: '',
    accountNumber: '',
    amount: '',
    status: 'draft'
  });
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for Audio
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Ref for updating logs without re-renders affecting callbacks
  const logsRef = useRef<LogMessage[]>([]);
  
  const addLog = (role: 'user' | 'agent' | 'system', text: string) => {
    const newLog = {
      id: Date.now().toString() + Math.random(),
      role,
      text,
      timestamp: new Date()
    };
    logsRef.current = [...logsRef.current, newLog];
    setLogs(prev => [...prev, newLog]);
  };

  const connect = async () => {
    if (!API_KEY) {
      setError("API Key is missing. Please check your environment configuration.");
      return;
    }

    try {
      setState(AgentState.CONNECTING);
      setError(null);
      addLog('system', 'Initializing audio secure context...');

      // Setup Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect to Gemini Live
      addLog('system', 'Connecting to CivicAlly Neural Core...');
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [updateClaimDraftFunction] }],
          inputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setState(AgentState.LISTENING);
            addLog('system', 'Connected. Speak now.');
            
            // Start Streaming Input
            if (!inputContextRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 10, 1)); // Scale for UI

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls (The "Brain" of the Agent)
            if (msg.toolCall) {
               addLog('system', 'Agent is updating the claim form...');
               const responses = [];
               for (const fc of msg.toolCall.functionCalls) {
                  if (fc.name === 'updateClaimDraft') {
                    const args = fc.args as any;
                    console.log('Tool Call Args:', args);
                    
                    // Update React State with new form data
                    setClaimDraft(prev => ({
                        ...prev,
                        ...args
                    }));

                    responses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { result: 'Form updated successfully' }
                    });
                  }
               }
               // Send tool response back
               sessionPromise.then(session => {
                   session.sendToolResponse({
                       functionResponses: responses as any
                   });
               });
            }

            // Handle Transcripts (Logs)
            if (msg.serverContent?.inputTranscription) {
                addLog('user', msg.serverContent.inputTranscription.text);
            }
            
            // Handle Audio Output (The "Voice" of the Agent)
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setState(AgentState.SPEAKING);
              if (!outputContextRef.current) return;

              const audioBuffer = await decodeAudioData(
                decode(audioData),
                outputContextRef.current,
                24000,
                1
              );
              
              const source = outputContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputContextRef.current.destination);
              
              // Schedule playback
              const currentTime = outputContextRef.current.currentTime;
              const startTime = Math.max(nextStartTimeRef.current, currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                   setState(AgentState.LISTENING);
                }
              };
            }
            
            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
                addLog('system', 'Agent interrupted');
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            addLog('system', 'Connection closed');
            setState(AgentState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection error. Please retry.");
            setState(AgentState.ERROR);
          }
        }
      });
      sessionRef.current = await sessionPromise;

    } catch (e) {
      console.error(e);
      setError("Failed to initialize audio. Please allow microphone access.");
      setState(AgentState.ERROR);
    }
  };

  const disconnect = async () => {
    if (sessionRef.current) {
        // There isn't a direct close method on the LiveSession interface exposed in the prompt types
        // usually, but we can stop sending data and close contexts.
        // Assuming we just stop the processor and audio tracks.
    }
    
    // Stop Mic
    streamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    inputContextRef.current?.close();
    outputContextRef.current?.close();
    
    setState(AgentState.DISCONNECTED);
    setVolume(0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionRef.current) return;

    addLog('system', `Uploading ${file.name}...`);
    
    try {
        const base64 = await blobToBase64(file);
        sessionRef.current.sendRealtimeInput({
            media: {
                mimeType: file.type,
                data: base64
            }
        });
        addLog('user', `[Uploaded Image: ${file.name}]`);
    } catch (err) {
        console.error("Upload failed", err);
        addLog('system', 'Upload failed');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Bar - Status & Controls */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className={`h-3 w-3 rounded-full ${state === AgentState.DISCONNECTED ? 'bg-red-400' : 'bg-green-500 animate-pulse'}`}></div>
          <span className="font-semibold text-slate-700 capitalize">{state === AgentState.DISCONNECTED ? 'Offline' : state}</span>
        </div>
        
        <div className="flex items-center space-x-4">
             {state !== AgentState.DISCONNECTED && (
                 <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-3 py-1">
                    <div className="h-2 bg-blue-500 rounded-full transition-all duration-75" style={{ width: `${Math.max(4, volume * 100)}px`}}></div>
                 </div>
             )}

            {state === AgentState.DISCONNECTED ? (
                <button 
                  onClick={connect}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center space-x-2"
                >
                  <i className="fas fa-microphone"></i>
                  <span>Connect to Caseworker</span>
                </button>
            ) : (
                <button 
                  onClick={disconnect}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-6 py-2 rounded-full font-medium transition-all border border-red-200"
                >
                  End Session
                </button>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-6 gap-6">
        
        {/* Left Panel: Form & Visuals */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-20 md:pb-0">
           {/* Dynamic Form */}
           <ClaimForm data={claimDraft} />

           {/* Document Upload Area */}
           {state !== AgentState.DISCONNECTED && (
               <div className="bg-white rounded-xl shadow-sm border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center space-y-3 transition-colors hover:bg-slate-50">
                   <div className="h-12 w-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                       <i className="fas fa-cloud-upload-alt text-xl"></i>
                   </div>
                   <div>
                       <h4 className="font-medium text-slate-700">Upload Supporting Documents</h4>
                       <p className="text-sm text-slate-500">Passbook, Death Certificate, or ID Card</p>
                   </div>
                   <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="doc-upload" 
                    />
                   <label htmlFor="doc-upload" className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                       Select File
                   </label>
               </div>
           )}

           {error && (
               <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center space-x-3">
                   <i className="fas fa-exclamation-triangle"></i>
                   <span>{error}</span>
               </div>
           )}
        </div>

        {/* Right Panel: Conversation Transcript */}
        <div className="w-full md:w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-[500px] md:h-auto">
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <h3 className="font-semibold text-slate-700">Live Transcript</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {logs.length === 0 && (
                    <div className="text-center text-slate-400 mt-10">
                        <i className="fas fa-comments text-4xl mb-3 opacity-50"></i>
                        <p>Conversation logs will appear here.</p>
                    </div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                            log.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : log.role === 'system'
                            ? 'bg-slate-100 text-slate-500 text-xs text-center w-full italic'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                            {log.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default LiveAgent;