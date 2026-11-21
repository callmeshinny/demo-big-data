import { createElement } from "react";

export function visiblePipelineMeasurements(measurements) {
  return measurements?.show === true ? measurements : null;
}

export function PipelineMeasurementBadge({ measurements }) {
  return visiblePipelineMeasurements(measurements)
    ? createElement("span", { className: "tag tag-diff" }, "Smoke / chờ TV2 xác nhận")
    : null;
}
