import { ACCESS_ONLY_ITEM_KEYS, getActionOptions } from "./EmployeeManagementPage";

describe("employee permission options", () => {
  it("uses a single access toggle for staff-facing master modules", () => {
    const options = getActionOptions(
      "masters",
      {
        key: "companies_manage",
        label: "Companies",
        permissions: ["companies.view", "companies.create", "companies.edit", "companies.delete"],
      },
      "access"
    );

    expect(ACCESS_ONLY_ITEM_KEYS.has("companies_manage")).toBe(true);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ id: "companies_manage:access", label: "Access" });
  });

  it("keeps the access-only dropdown for senior roles too", () => {
    const options = getActionOptions(
      "masters",
      {
        key: "companies_manage",
        label: "Companies",
        permissions: ["companies.view", "companies.create", "companies.edit", "companies.delete"],
      },
      "senior"
    );

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ id: "companies_manage:access", label: "Access" });
  });
});
