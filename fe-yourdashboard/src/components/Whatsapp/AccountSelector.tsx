// components/AccountSelector.tsx
import { Select } from 'antd';
import { accounts } from '../mock/data';

export default function AccountSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <Select
      placeholder="Selecciona una cuenta"
      style={{ width: 200, marginBottom: 16 }}
      onChange={onSelect}
      options={accounts.map((acc) => ({ value: acc.id, label: acc.name }))}
    />
  );
}
