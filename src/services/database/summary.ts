import { dbOperation, type DbResult } from './index';

export type DataLayerCounts = {
  schema: number; profile: number; targets: number; settings: number;
};

/** Only fixed known tables may be interpolated into SQL. Read-only device diagnostic. */
export async function getDataLayerCounts(): Promise<DbResult<DataLayerCounts>> {
  return dbOperation(async db => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    const count = async (name: 'profile' | 'targets' | 'app_settings') =>
      (await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${name}`))?.total ?? 0;
    return {
      schema: version?.user_version ?? 0,
      profile: await count('profile'),
      targets: await count('targets'),
      settings: await count('app_settings'),
    };
  });
}
