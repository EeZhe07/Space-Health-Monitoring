// Shapes of the files in /data. Field names match the JSON/CSV exactly.

export type HrContext = "exercise" | "post_exercise" | "rest" | string;

export interface HrReading {
  record_id: string;
  crew_id: string;
  value: number;
  unit: string;
  measured_at: string;
  context: HrContext;
  quality: string;
}

interface BaseEvent {
  event_id: string;
  crew_id: string;
  source?: string;
  synthetic?: boolean;
  /** Added by the UI for events the user creates during the demo. */
  user_added?: boolean;
}

export interface SensorDisconnectedEvent extends BaseEvent {
  type: "sensor_disconnected";
  time: string;
}

export interface SymptomReportEvent extends BaseEvent {
  type: "symptom_report";
  symptom: string;
  description?: string;
  reporter: string;
  reported_at: string;
  onset_at?: string;
  onset_certainty?: "exact" | "approximate" | string;
  status: "open" | "resolved" | string;
}

export interface AssistanceRequestedEvent extends BaseEvent {
  type: "assistance_requested";
  by: string;
  time: string;
}

export interface HandoffAcknowledgedEvent extends BaseEvent {
  type: "handoff_acknowledged";
  by: string;
  time: string;
}

export type CrewEvent =
  | SensorDisconnectedEvent
  | SymptomReportEvent
  | AssistanceRequestedEvent
  | HandoffAcknowledgedEvent;

export interface OpenSymptom {
  symptom: string;
  reported_at: string;
  onset_at?: string;
  onset_certainty?: string;
  reporter: string;
}

export interface Assessment {
  crew_id: string;
  mission_day: number;
  evaluated_at: string;
  rule_version: string;
  symptom_status: "open" | "none_open";
  open_symptoms: OpenSymptom[];
  current_hr: {
    status: "current" | "unknown";
    last_reliable: {
      value: number;
      unit: string;
      measured_at: string;
      context: HrContext;
    } | null;
  };
  sensor: "connected" | "disconnected" | "no_data";
  unknowns: string[];
  actions_taken: string[];
  assistance: string;
  handoff: { status: "not_needed" | "pending" | "acknowledged"; by: string | null; at: string | null };
  reasons: string[];
  contributing_ids: string[];
  labels: string[];
}

export interface Scenario {
  id: string;
  readings: HrReading[];
  events: CrewEvent[];
  expected: Assessment | null;
}
