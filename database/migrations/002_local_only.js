/**
 * Migration 002: o Stardew Monitor passou a rodar só no computador local, sem login.
 * Remove as tabelas de sessões e usuários (notes.author_id fica sem uso).
 */
export const id = '002_local_only';

export function up() {
  return ['DROP TABLE IF EXISTS sessions', 'DROP TABLE IF EXISTS users'];
}
