export const ROLES = {
  GUEST: 'guest',         // Not logged in
  USER: 'USER',           // Applicant
  EMP: 'EMP',             // Employee
  MEMBER: 'MEMBER',       // Employee invited to recruitment post
  MANAGER: 'MANAGER',     // HR Manager
  ADMIN: 'ADMIN'          // Website Admin
};

// Role hierarchy (higher roles include permissions of lower roles)
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.EMP, ROLES.USER, ROLES.GUEST],
  [ROLES.MANAGER]: [ROLES.MANAGER, ROLES.MEMBER, ROLES.EMP, ROLES.USER, ROLES.GUEST],
  [ROLES.MEMBER]: [ROLES.MEMBER, ROLES.EMP, ROLES.USER, ROLES.GUEST],
  [ROLES.EMP]: [ROLES.EMP, ROLES.USER, ROLES.GUEST],
  [ROLES.USER]: [ROLES.USER, ROLES.GUEST],
  [ROLES.GUEST]: [ROLES.GUEST]
}; 