


export const UserRole = {
    ADMIN: 'admin',
    USER: 'user',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];