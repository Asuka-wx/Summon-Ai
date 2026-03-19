export function shouldAcceptSseEvent({
  eventId,
  lastReceivedEventId,
}: {
  eventId: number;
  lastReceivedEventId: number;
}) {
  return eventId > lastReceivedEventId;
}
