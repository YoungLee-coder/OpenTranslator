import { useState } from "react";
import { useContent } from "@/lib/i18n";
import type { DemoUserRow, PermissionId } from "@/demo-content";
import { CheckIcon, PlusIcon, TrashIcon, UsersIcon } from "../icons";
import { MockField, MockInput, MockSwitch } from "../mock-ui";

const PERMISSION_IDS: readonly PermissionId[] = [
  "translate",
  "write",
  "providers",
  "settings",
  "usage",
];

/** Dashboard → 多用户管理: account table with an inline add form. */
export function UsersPanel() {
  const { product } = useContent();
  const d = product.dashboard.users;
  const [rows, setRows] = useState<DemoUserRow[]>(() =>
    d.rows.map((row) => ({ ...row })),
  );
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<ReadonlySet<PermissionId>>(
    () => new Set<PermissionId>(["translate", "write"]),
  );

  function togglePerm(id: PermissionId, next: boolean) {
    setPerms((prev) => {
      const set = new Set(prev);
      if (next) set.add(id);
      else set.delete(id);
      return set;
    });
  }

  function startAdd() {
    setAdding(true);
    setName("");
    setPassword("");
    setPerms(new Set<PermissionId>(["translate", "write"]));
  }

  function addUser() {
    setRows((prev) => [
      ...prev,
      {
        id: `u-new-${prev.length + 1}`,
        name: name.trim() || `user${prev.length + 1}`,
        role: "user",
        enabled: true,
        permissions: [...perms],
      },
    ]);
    setAdding(false);
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <div className="mock-stack">
      {adding ? (
        <section className="mock-card-block mock-editor">
          <div className="mock-card-head">
            <strong>{d.addTitle}</strong>
          </div>
          <div className="mock-card-pad">
            <div className="mock-field-row">
              <MockField label={d.usernameCol}>
                <MockInput
                  value={name}
                  onChange={setName}
                  ariaLabel={d.usernameCol}
                />
              </MockField>
              <MockField label={d.passwordLabel} hint={d.passwordHint}>
                <MockInput
                  value={password}
                  onChange={setPassword}
                  type="password"
                  ariaLabel={d.passwordLabel}
                />
              </MockField>
            </div>
            <div className="mock-field">
              <span className="mock-field-label">{d.permissionsTitle}</span>
              <div className="mock-perm-list">
                {PERMISSION_IDS.map((id) => (
                  <div key={id} className="mock-perm-row">
                    <span>{d.permissions[id]}</span>
                    <MockSwitch
                      checked={perms.has(id)}
                      onChange={(next) => togglePerm(id, next)}
                      label={d.permissions[id]}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mock-form-actions">
              <button
                type="button"
                className="mock-btn ghost sm"
                onClick={() => setAdding(false)}
              >
                {d.cancel}
              </button>
              <button type="button" className="mock-btn sm" onClick={addUser}>
                <CheckIcon />
                {d.save}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mock-card-block">
        <div className="mock-card-head">
          <strong>{d.cardTitle}</strong>
          <button type="button" className="mock-btn sm" onClick={startAdd}>
            <PlusIcon />
            {d.addLabel}
          </button>
        </div>
        <p className="mock-card-subtitle mock-card-subtitle-pad">{d.description}</p>
        {rows.length === 0 ? (
          <div className="mock-empty">
            <span className="mock-empty-icon">
              <UsersIcon />
            </span>
            <p>{d.empty}</p>
          </div>
        ) : (
          <div className="mock-table mock-table-plain">
            <table>
              <thead>
                <tr>
                  <th>{d.usernameCol}</th>
                  <th>{d.roleCol}</th>
                  <th className="mock-col-status">{d.statusCol}</th>
                  <th>{d.permCol}</th>
                  <th className="mock-col-actions">{d.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isAdmin = row.role === "admin";
                  return (
                    <tr key={row.id} className={row.enabled ? undefined : "is-off"}>
                      <td className="mock-cell-strong">{row.name}</td>
                      <td>{isAdmin ? d.roleAdmin : d.roleUser}</td>
                      <td className="mock-col-status">
                        <span className="mock-status">
                          <MockSwitch
                            checked={row.enabled}
                            onChange={(next) =>
                              setRows((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, enabled: next }
                                    : item,
                                ),
                              )
                            }
                            label={`${row.name} ${d.statusCol}`}
                          />
                          {row.enabled ? d.enabled : d.disabled}
                        </span>
                      </td>
                      <td className="mock-cell-desc">
                        {isAdmin
                          ? d.allPermissions
                          : row.permissions.length > 0
                            ? row.permissions.map((id) => d.permissions[id]).join("、")
                            : d.noPermissions}
                      </td>
                      <td className="mock-col-actions">
                        <button
                          type="button"
                          className="mock-foot-action danger"
                          disabled={isAdmin}
                          onClick={() => remove(row.id)}
                        >
                          <TrashIcon />
                          {d.deleteLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
