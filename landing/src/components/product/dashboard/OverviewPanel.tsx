import { useState } from "react";
import { useContent } from "@/lib/i18n";
import { ActivityIcon, CheckIcon, FileTextIcon, UploadIcon } from "../icons";
import { MockField, MockInput } from "../mock-ui";

function ProfileCard() {
  const { product } = useContent();
  const p = product.dashboard.profile;
  const [username, setUsername] = useState(p.usernameValue);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState(true);

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  return (
    <section className="mock-card-block">
      <div className="mock-card-head">
        <strong>{p.cardTitle}</strong>
      </div>
      <div className="mock-profile">
        <div className="mock-profile-side">
          <span className={avatar ? "mock-profile-avatar has-image" : "mock-profile-avatar"}>
            {avatar ? "Y" : null}
          </span>
          <div className="mock-profile-actions">
            <button
              type="button"
              className="mock-btn ghost sm"
              onClick={() => setAvatar(true)}
            >
              <UploadIcon />
              {p.uploadAvatar}
            </button>
            {avatar ? (
              <button
                type="button"
                className="mock-btn ghost sm danger"
                onClick={() => setAvatar(false)}
              >
                {p.removeAvatar}
              </button>
            ) : null}
          </div>
          <p className="mock-hint">{p.avatarHint}</p>
        </div>
        <div className="mock-profile-form">
          <MockField label={p.usernameLabel}>
            <MockInput value={username} onChange={setUsername} ariaLabel={p.usernameLabel} />
          </MockField>
          <MockField label={p.currentPasswordLabel}>
            <MockInput
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
              ariaLabel={p.currentPasswordLabel}
            />
          </MockField>
          <MockField
            label={p.newPasswordLabel}
            hint={p.newPasswordPlaceholder}
          >
            <MockInput
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              ariaLabel={p.newPasswordLabel}
            />
          </MockField>
          <button type="button" className="mock-btn" onClick={save}>
            {saved ? <CheckIcon /> : null}
            {saved ? product.ui.savedLabel : p.save}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Dashboard → 概览: usage stats, per-provider table, profile form. */
export function OverviewPanel() {
  const o = useContent().product.dashboard.overview;

  return (
    <div className="mock-stack">
      <section className="mock-card-block">
        <div className="mock-card-pad">
          <div className="mock-card-title">{o.cardTitle}</div>
          <div className="mock-stats">
            <div className="mock-stat">
              <div className="mock-stat-icon">
                <ActivityIcon />
              </div>
              <div className="v">{o.totalRequestsValue}</div>
              <div className="k">{o.totalRequestsLabel}</div>
            </div>
            <div className="mock-stat">
              <div className="mock-stat-icon">
                <FileTextIcon />
              </div>
              <div className="v">{o.totalCharsValue}</div>
              <div className="k">{o.totalCharsLabel}</div>
            </div>
          </div>
          <div className="mock-table mock-table-plain">
            <table>
              <thead>
                <tr>
                  <th>{o.providerCol}</th>
                  <th className="num">{o.requestsCol}</th>
                  <th className="num">{o.charsCol}</th>
                </tr>
              </thead>
              <tbody>
                {o.rows.map((row) => (
                  <tr key={row.provider}>
                    <td>
                      <span className="mock-provider">
                        <span className={`mock-dot mock-dot-${row.type}`} aria-hidden />
                        {row.provider}
                      </span>
                    </td>
                    <td className="num">{row.requests}</td>
                    <td className="num">{row.chars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <ProfileCard />
    </div>
  );
}
