/**
 * AEON Dial v3 — Telephony barrel export
 */
export { originate, hangup, answer, getChannel, listChannels, startRecording, stopRecording, AriEventStream } from "./ari-client";
export type { AriChannel, AriBridge, AriEvent } from "./ari-client";
export { originateCall, hangupCall, setDisposition, getCall, listCalls, getActiveCalls, initCallEventLoop, getEventStream } from "./call-manager";
export type { OriginateParams } from "./call-manager";
