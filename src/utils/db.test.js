// Mock 2 gói Tauri để test được ngoài app.
vi.mock('@tauri-apps/plugin-sql', () => ({ __esModule: true, default: { load: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { runTx } from './db';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pb-db-path-active', 'D:\\x\\problem_bank.db');
  invoke.mockReset();
});

test('runTx([]) → no-op, KHÔNG gọi invoke', async () => {
  await expect(runTx([])).resolves.toBe(true);
  expect(invoke).not.toHaveBeenCalled();
});

test('runTx: gửi execute_tx đúng dbPath + statements', async () => {
  invoke.mockResolvedValue(2);
  const stmts = [{ sql: 'DELETE FROM x WHERE id=$1', params: ['a'] }];
  await expect(runTx(stmts)).resolves.toBe(true);
  expect(invoke).toHaveBeenCalledWith('execute_tx', { dbPath: 'D:\\x\\problem_bank.db', statements: stmts });
});

test('runTx: Rust lỗi → NÉM (để hook trả false)', async () => {
  invoke.mockRejectedValue(new Error('disk full'));
  await expect(runTx([{ sql: 'X', params: [] }])).rejects.toThrow('disk full');
});
