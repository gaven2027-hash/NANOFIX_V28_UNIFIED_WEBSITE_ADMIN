export type StatusMachineName =
  | "lead"
  | "service_request"
  | "inspection"
  | "quotation"
  | "job"
  | "invoice"
  | "payment"
  | "receipt"
  | "warranty";

export const allowedTransitions: Record<StatusMachineName, Record<string, string[]>> = {
  lead: {
    new: ["qualified", "duplicate", "lost", "archived"],
    qualified: ["converted", "lost", "archived"],
    converted: ["archived"],
    duplicate: ["archived"],
    lost: ["archived"],
    archived: []
  },
  service_request: {
    pending_review: ["scheduled", "cancelled"],
    scheduled: ["inspected", "cancelled"],
    inspected: ["quoted", "cancelled"],
    quoted: ["approved", "cancelled"],
    approved: [],
    cancelled: []
  },
  inspection: {
    scheduled: ["assigned", "rescheduled", "cancelled"],
    assigned: ["in_progress", "rescheduled", "cancelled"],
    in_progress: ["completed", "rescheduled"],
    completed: [],
    rescheduled: ["assigned", "cancelled"],
    cancelled: []
  },
  quotation: {
    draft: ["sent", "cancelled"],
    sent: ["viewed", "accepted", "rejected", "expired", "revised"],
    viewed: ["accepted", "rejected", "expired", "revised"],
    accepted: ["revised"],
    rejected: ["revised", "cancelled"],
    expired: ["revised", "cancelled"],
    revised: ["sent", "cancelled"],
    cancelled: []
  },
  job: {
    assigned: ["en_route", "cancelled"],
    en_route: ["arrived", "cancelled"],
    arrived: ["in_progress"],
    in_progress: ["completed", "rework_required"],
    completed: ["rework_required"],
    rework_required: ["assigned", "in_progress", "completed"],
    cancelled: []
  },
  invoice: {
    draft: ["issued", "void"],
    issued: ["partially_paid", "paid", "overdue", "void"],
    partially_paid: ["paid", "overdue", "void"],
    paid: [],
    overdue: ["partially_paid", "paid", "void"],
    void: []
  },
  payment: {
    pending: ["processing", "failed"],
    processing: ["succeeded", "failed"],
    succeeded: ["refunded", "partially_refunded"],
    failed: [],
    refunded: [],
    partially_refunded: ["refunded"]
  },
  receipt: {
    draft: ["issued"],
    issued: ["corrected", "void"],
    corrected: ["issued", "void"],
    void: []
  },
  warranty: {
    active: ["expiring", "claim_opened", "expired"],
    expiring: ["expired", "claim_opened"],
    expired: ["claim_opened"],
    claim_opened: ["claim_approved", "claim_rejected"],
    claim_approved: ["resolved"],
    claim_rejected: ["resolved"],
    resolved: []
  }
};

export function isStatusMachineName(value: string): value is StatusMachineName {
  return Object.hasOwn(allowedTransitions, value);
}

export function canTransition(machine: StatusMachineName, fromStatus: string, toStatus: string) {
  return allowedTransitions[machine]?.[fromStatus]?.includes(toStatus) ?? false;
}

export function assertTransition(machine: StatusMachineName, fromStatus: string, toStatus: string) {
  if (!canTransition(machine, fromStatus, toStatus)) {
    throw new Error(`Invalid ${machine} transition: ${fromStatus} -> ${toStatus}`);
  }
}
