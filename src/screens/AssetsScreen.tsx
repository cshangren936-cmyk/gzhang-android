import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { assetMetrics } from "../core/assets";
import { localDate } from "../core/date";
import { formatPrivateMoney } from "../core/money";
import type { ElectronicAsset } from "../types";
import { AppIcon } from "../components/AppIcon";
import { AssetSheet } from "../components/AssetSheet";
import { AttachmentImage } from "../components/AttachmentImage";

export function AssetsScreen() {
  const { data, setData, t, activeBookId } = useApp();
  const [editing, setEditing] = useState<ElectronicAsset | null | undefined>(
    undefined,
  );
  const assets = useMemo(
    () =>
      data.electronicAssets
        .filter(
          (asset) =>
            asset.bookId === activeBookId &&
            !asset.archived &&
            (asset.status ?? "active") !== "retired",
        )
        .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
    [activeBookId, data.electronicAssets],
  );
  const today = localDate();
  const expiring = assets.filter((asset) => {
    const days = assetMetrics(asset, today).warrantyDaysLeft;
    return (
      days !== null &&
      days >= 0 &&
      days <= data.settings.warrantyReminderDays
    );
  });
  const total = assets.reduce(
    (sum, asset) => sum + asset.purchaseAmount,
    0,
  );

  return (
    <div className="screen assets-screen">
      <section className="paper-hero asset-hero">
        <div>
          <span>{t("electronicAssets")}</span>
          <strong>
            {formatPrivateMoney(
              total,
              data.settings.language,
              data.settings.hideAmounts,
              data.settings.currency,
            )}
          </strong>
          <small>
            {assets.length} {t("assets")} · {expiring.length}{" "}
            {t("warrantySoon")}
          </small>
        </div>
        <AppIcon name="PackageCheck" size={38} />
      </section>

      {expiring.length > 0 && (
        <section className="warranty-alert">
          <AppIcon name="BellRing" size={20} />
          <div>
            <strong>{t("warrantySoon")}</strong>
            <span>
              {expiring
                .slice(0, 2)
                .map((asset) => asset.name)
                .join("、")}
            </span>
          </div>
        </section>
      )}

      <div className="section-header">
        <h2>{t("electronicAssets")}</h2>
        <button className="text-button" onClick={() => setEditing(null)}>
          <AppIcon name="Plus" size={16} />
          {t("addAsset")}
        </button>
      </div>

      <section className="asset-grid">
        {assets.length ? (
          assets.map((asset, index) => {
            const metrics = assetMetrics(asset, today);
            return (
              <article
                className={`asset-card paper-${(index % 4) + 1}`}
                key={asset.id}
                onClick={() => setEditing(asset)}
              >
                <span className="paper-tape" />
                <div className="asset-card-top">
                  <div>
                    <strong>{asset.name}</strong>
                    <small>{asset.purchaseDate}</small>
                  </div>
                  <span
                    className={`status-stamp ${
                      metrics.paidBack ? "done" : ""
                    }`}
                  >
                    {metrics.paidBack ? t("paidBack") : t("payingBack")}
                  </span>
                </div>
                {(asset.status ?? "active") === "sold" && (
                  <span className="asset-sold-stamp">{t("assetSold")}</span>
                )}
                <div className="daily-cost">
                  <small>{t("dailyCost")}</small>
                  <b>
                    {data.settings.currency} {metrics.dailyCost.toFixed(2)}
                    <em>/{t("days")}</em>
                  </b>
                </div>
                <div className="asset-metrics">
                  <span>
                    {t("usedDays")}
                    <b>
                      {metrics.usedDays} {t("days")}
                    </b>
                  </span>
                  <span>
                    {metrics.warrantyDaysLeft === null
                      ? t("warrantyEnd")
                      : metrics.warrantyDaysLeft < 0
                        ? t("warrantyExpired")
                        : t("warrantyRemaining")}
                    <b>
                      {metrics.warrantyDaysLeft === null
                        ? "—"
                        : metrics.warrantyDaysLeft < 0
                          ? `-${Math.abs(metrics.warrantyDaysLeft)} ${t("days")}`
                          : `${metrics.warrantyDaysLeft} ${t("days")}`}
                    </b>
                  </span>
                </div>
                {asset.receiptImage && (
                  <AttachmentImage
                    className="asset-thumb"
                    reference={asset.receiptImage}
                    alt=""
                  />
                )}
                <button
                  className="asset-delete"
                  type="button"
                  aria-label={t("delete")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setData((current) => ({
                      ...current,
                      electronicAssets: current.electronicAssets.map(
                        (item) =>
                          item.id === asset.id
                            ? { ...item, archived: true }
                            : item,
                      ),
                    }));
                  }}
                >
                  <AppIcon name="Trash2" size={15} />
                </button>
              </article>
            );
          })
        ) : (
          <div className="empty-state paper-empty">{t("noAssets")}</div>
        )}
      </section>

      {editing !== undefined && (
        <AssetSheet
          asset={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
