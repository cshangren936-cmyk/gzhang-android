import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { makeId } from "../core/id";
import { Modal } from "./Modal";

const colors = ["#6C5CE7", "#31C7A4", "#FF8C61", "#4B9AFA", "#E370D6"];

export function BookSheet({ onClose }: { onClose: () => void }) {
  const { setData, t } = useApp();
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = makeId("book");
    setData((current) => ({
      ...current,
      settings: { ...current.settings, activeBookId: id },
      books: [
        ...current.books,
        { id, name: name.trim(), color, createdAt: new Date().toISOString() },
      ],
      accounts: [
        ...current.accounts,
        {
          id: makeId("account"),
          bookId: id,
          name: t("cash"),
          type: "cash",
          openingBalance: 0,
          color: "#31C7A4",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    onClose();
  }

  return (
    <Modal title={t("addBook")} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>{t("bookName")}</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <div className="color-picker">
          {colors.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={item}
              className={color === item ? "selected" : ""}
              style={{ backgroundColor: item }}
              onClick={() => setColor(item)}
            />
          ))}
        </div>
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
