export interface SecurityClock {
  readonly nowEpochSeconds: () => number;
}
