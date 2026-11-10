


export const UserRole = {
    ADMIN: 'admin',
    STUDENT: 'student',
    PARENT: 'parent',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];