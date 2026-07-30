import { useState } from "react";
import { useApp } from "../AppContext";
import { downloadWebDav, uploadWebDav } from "../core/sync";
import { makeId } from "../core/id";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

export function SyncSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [memberName, setMemberName] = useState("");

  function patch(patchValue: Partial<typeof data.syncSettings>) {
    setData((current) => ({
      ...current,
      syncSettings: { ...current.syncSettings, ...patchValue },
    }));
  }

  async function upload() {
    setBusy(true);
    setMessage("");
    try {
      const lastSyncedAt = await uploadWebDav(data, data.syncSettings);
      setData((current) => ({
        ...current,
        syncSettings: { ...current.syncSettings, lastSyncedAt },
      }));
      setMessage(t("syncUploaded"));
    } catch {
      setMessage(t("syncFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!window.confirm(t("confirmCloudRestore"))) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await downloadWebDav(data.syncSettings);
      setData({
        ...result.data,
        syncSettings: {
          ...result.data.syncSettings,
          ...data.syncSettings,
          lastSyncedAt: result.updatedAt ?? new Date().toISOString(),
        },
      });
      setMessage(t("syncDownloaded"));
    } catch {
      setMessage(t("syncFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={t("cloudSync")} onClose={onClose} className="sync-sheet">
      <p className="privacy-note">{t("syncPrivacy")}</p>
      <label className="field">
        <span>{t("webdavEndpoint")}</span>
        <input
          value={data.syncSettings.endpoint}
          placeholder="https://example.com/remote.php/dav/files/..."
          onChange={(event) =>
            patch({ provider: "webdav", endpoint: event.target.value })
          }
        />
      </label>
      <div className="two-column">
        <label className="field">
          <span>{t("username")}</span>
          <input
            value={data.syncSettings.username}
            onChange={(event) => patch({ username: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("password")}</span>
          <input
            type="password"
            value={data.syncSettings.password}
            onChange={(event) => patch({ password: event.target.value })}
          />
        </label>
      </div>
      <label className="field">
        <span>{t("remoteFile")}</span>
        <input
          value={data.syncSettings.remotePath}
          onChange={(event) => patch({ remotePath: event.target.value })}
        />
      </label>
      <div className="sync-actions">
        <button disabled={busy || !data.syncSettings.endpoint} onClick={upload}>
          <AppIcon name="CloudUpload" size={17} />
          {t("uploadCloud")}
        </button>
        <button disabled={busy || !data.syncSettings.endpoint} onClick={download}>
          <AppIcon name="CloudDownload" size={17} />
          {t("downloadCloud")}
        </button>
      </div>
      {message && <p className="settings-message">{message}</p>}

      <section className="shared-members">
        <h3>{t("bookMembers")}</h3>
        {data.sharedMembers
          .filter((member) => member.bookId === activeBookId)
          .map((member) => (
            <div key={member.id}>
              <i style={{ background: member.color }} />
              <strong>{member.name}</strong>
              <span>{t(member.role)}</span>
              {member.role !== "owner" && (
                <button
                  onClick={() =>
                    setData((current) => ({
                      ...current,
                      sharedMembers: current.sharedMembers.filter(
                        (item) => item.id !== member.id,
                      ),
                    }))
                  }
                >
                  <AppIcon name="Trash2" size={14} />
                </button>
              )}
            </div>
          ))}
        <div className="member-add">
          <input
            value={memberName}
            placeholder={t("memberName")}
            onChange={(event) => setMemberName(event.target.value)}
          />
          <button
            onClick={() => {
              if (!memberName.trim()) return;
              setData((current) => ({
                ...current,
                sharedMembers: [
                  ...current.sharedMembers,
                  {
                    id: makeId("member"),
                    bookId: activeBookId,
                    name: memberName.trim(),
                    role: "editor",
                    color: "#7E9F74",
                    createdAt: new Date().toISOString(),
                  },
                ],
              }));
              setMemberName("");
            }}
          >
            <AppIcon name="Plus" size={15} />
            {t("addMember")}
          </button>
        </div>
      </section>
    </Modal>
  );
}

