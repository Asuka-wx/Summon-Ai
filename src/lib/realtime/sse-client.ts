"use client";

export async function createTaskEventSource(taskId: string) {
  if (!taskId) {
    return null;
  }

  return new EventSource(`/api/v1/tasks/${encodeURIComponent(taskId)}/stream`);
}

export async function createBroadcastBidEventSource(broadcastId: string) {
  if (!broadcastId) {
    return null;
  }

  return new EventSource(`/api/v1/broadcasts/${encodeURIComponent(broadcastId)}/bids`);
}
