// Marker color by infra type; opacity/edge conveys status.
export const TYPE_COLORS: Record<string, [number, number, number]> = {
  metro: [56, 189, 248],
  rrts: [129, 140, 248],
  airport: [244, 114, 182],
  road: [251, 191, 36],
  industrial: [148, 163, 184],
  hospital: [52, 211, 153],
  school: [110, 231, 183],
  mall: [248, 113, 113],
  construction_detected: [203, 213, 225],
  other: [148, 163, 184],
};

export function colorForType(type: string): [number, number, number] {
  return TYPE_COLORS[type] ?? TYPE_COLORS.other;
}

// Operational events are fully opaque; proposed are faint.
export function alphaForStatus(status: string): number {
  switch (status) {
    case "operational":
      return 235;
    case "under_construction":
      return 200;
    case "approved":
      return 170;
    case "proposed":
      return 120;
    default:
      return 160;
  }
}
