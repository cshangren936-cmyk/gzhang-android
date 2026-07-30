import { CapacitorHttp } from "@capacitor/core";
import type { AppData, SyncSettings } from "../types";
import {
  createPortableBackup,
  restorePortableBackup,
} from "../data/portableBackup";

function remoteUrl(settings: SyncSettings): string {
  const endpoint = settings.endpoint.replace(/\/+$/, "");
  const path = (settings.remotePath || "gzhang-backup.json").replace(/^\/+/, "");
  return `${endpoint}/${path}`;
}

function headers(settings: SyncSettings): Record<string, string> {
  const result: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (settings.username || settings.password) {
    result.Authorization = `Basic ${btoa(
      unescape(encodeURIComponent(`${settings.username}:${settings.password}`)),
    )}`;
  }
  return result;
}

export async function uploadWebDav(
  data: AppData,
  settings: SyncSettings,
): Promise<string> {
  const updatedAt = new Date().toISOString();
  const response = await CapacitorHttp.request({
    method: "PUT",
    url: remoteUrl(settings),
    headers: headers(settings),
    data: {
      format: "gzhang-sync-v1",
      updatedAt,
      backup: JSON.parse(await createPortableBackup(data)),
    },
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`SYNC_HTTP_${response.status}`);
  }
  return updatedAt;
}

export async function downloadWebDav(
  settings: SyncSettings,
): Promise<{ data: AppData; updatedAt?: string }> {
  const response = await CapacitorHttp.request({
    method: "GET",
    url: remoteUrl(settings),
    headers: headers(settings),
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`SYNC_HTTP_${response.status}`);
  }
  const payload =
    typeof response.data === "string"
      ? (JSON.parse(response.data) as Record<string, unknown>)
      : (response.data as Record<string, unknown>);
  const rawData =
    payload.format === "gzhang-sync-v1" && payload.backup
      ? payload.backup
      : payload.format === "gzhang-sync-v1" && payload.data
        ? payload.data
        : payload;
  return {
    data: await restorePortableBackup(JSON.stringify(rawData)),
    updatedAt:
      typeof payload.updatedAt === "string" ? payload.updatedAt : undefined,
  };
}
