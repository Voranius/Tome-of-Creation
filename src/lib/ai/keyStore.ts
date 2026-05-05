import { Store } from '@tauri-apps/plugin-store'

let _store: Store | null = null

async function getStore(): Promise<Store> {
  if (!_store) _store = await Store.load('.settings.dat')
  return _store
}

export async function getKey(provider: string): Promise<string | null> {
  const store = await getStore()
  const val = await store.get<string>(`${provider}_key`)
  return val ?? null
}

export async function setKey(provider: string, key: string): Promise<void> {
  const store = await getStore()
  await store.set(`${provider}_key`, key)
  await store.save()
}

export async function removeKey(provider: string): Promise<void> {
  const store = await getStore()
  await store.delete(`${provider}_key`)
  await store.save()
}

export async function getStoredValue(key: string): Promise<string | null> {
  const store = await getStore()
  const val = await store.get<string>(key)
  return val ?? null
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  const store = await getStore()
  await store.set(key, value)
  await store.save()
}
