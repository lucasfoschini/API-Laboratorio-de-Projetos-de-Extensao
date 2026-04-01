// src/constants/selects.ts
// Selects compartilhados do Prisma — evita duplicação entre módulos

export const USER_SELECT = {
  id:          true,
  name:        true,
  email:       true,
  role:        true,
  department:  true,
  institution: true,
  avatar:      true,
  createdAt:   true,
  bio:         true,
  linkedin:    true,
  github:      true,
  phone:       true,
  website:     true,
};

// Versão pública — para perfis de outros usuários (sem e-mail)
export const USER_PUBLIC_SELECT = {
  id:          true,
  name:        true,
  role:        true,
  department:  true,
  institution: true,
  avatar:      true,
  bio:         true,
  linkedin:    true,
  github:      true,
  createdAt:   true,
};