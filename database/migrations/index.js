/**
 * Lista das migrations, em ordem. Importadas de forma estática para funcionar também
 * no aplicativo empacotado (um único arquivo). Nova migration = novo arquivo + nova linha aqui.
 */
import * as m001 from './001_initial.js';
import * as m002 from './002_local_only.js';

export const MIGRATIONS = [m001, m002];
