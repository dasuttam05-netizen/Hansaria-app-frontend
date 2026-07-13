import { getActionOptions } from "./EmployeeManagementPage";

describe("employee permission options", () => {
  it("shows the dropdown action options for master modules", () => {
    const options = getActionOptions(
      "masters",
      {
        key: "companies_manage",
        label: "Companies",
        permissions: ["companies.view", "companies.create", "companies.edit", "companies.delete"],
      },
      "staff"
    );

    expect(options.map((option) => option.id)).toEqual([
      "companies_manage:view",
      "companies_manage:create",
      "companies_manage:edit",
      "companies_manage:delete",
    ]);
  });

  it("shows the same dropdown action options for expense entry for senior roles", () => {
    const options = getActionOptions(
      "operations",
      {
        key: "expense_access",
        label: "Expense Entry",
        permissions: ["expense.view", "expense.create", "expense.edit", "expense.delete"],
      },
      "senior"
    );

    expect(options.map((option) => option.id)).toEqual([
      "expense_access:view",
      "expense_access:create",
      "expense_access:edit",
      "expense_access:delete",
    ]);
  });
});
