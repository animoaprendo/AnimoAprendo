import type { Db } from 'mongodb';

export type ApprovalScopeRole = 'superadmin' | 'college' | 'department';

export type ApprovalScope = {
  role: ApprovalScopeRole;
  collegeAbbreviation?: string;
  departmentName?: string;
};

export function resolveApprovalScope(publicMetadata: any): ApprovalScope | null {
  if (!publicMetadata?.isAdmin) {
    return null;
  }

  if (publicMetadata.adminRole === 'superadmin') {
    return { role: 'superadmin' };
  }

  const collegeAbbreviation = publicMetadata.college as string | undefined;
  const departmentName = publicMetadata.department as string | undefined;

  if (!collegeAbbreviation) {
    return null;
  }

  if (departmentName && departmentName !== 'ALL_DEPARTMENTS') {
    return {
      role: 'department',
      collegeAbbreviation,
      departmentName,
    };
  }

  return {
    role: 'college',
    collegeAbbreviation,
  };
}

export function normalizeDepartmentName(departmentName?: string | null): string | null {
  if (!departmentName || departmentName === 'ALL_DEPARTMENTS') {
    return null;
  }

  return departmentName;
}

export async function getDepartmentAutoApprove(
  db: Db,
  collegeAbbreviation: string,
  departmentName: string
): Promise<boolean> {
  const setting = await db.collection('approvalSettings').findOne({
    collegeAbbreviation,
    departmentName,
  });

  return setting?.autoApprove === true;
}