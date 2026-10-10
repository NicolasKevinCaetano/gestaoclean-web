
import {
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  DollarOutlined,
  WalletOutlined,
  UserOutlined
} from '@ant-design/icons';

import { getRole } from 'services/api';

const all = [
  { id: 'dashboard', title: 'Dashboard', url: '/', icon: DashboardOutlined, admin: true },
  { id: 'clientes', title: 'Clientes', url: '/clientes', icon: TeamOutlined },
  { id: 'agendamentos', title: 'Agendamentos', url: '/agendamentos', icon: CalendarOutlined },
  { id: 'ordens', title: 'Ordens de serviço', url: '/ordens-servico', icon: FileDoneOutlined },
  { id: 'pagamentos', title: 'Pagamentos', url: '/pagamentos', icon: DollarOutlined, admin: true },
  { id: 'despesas', title: 'Despesas', url: '/despesas', icon: WalletOutlined, admin: true },
  { id: 'usuarios', title: 'Usuários', url: '/usuarios', icon: UserOutlined, admin: true }
];

export function getMenuItems() {
  const admin = /^ADMIN$/i.test(getRole());

  return {
    items: [
      {
        id: 'gestaoclean',
        title: 'GestãoClean',
        type: 'group',
        children: all
          .filter((item) => !item.admin || admin)
          .map((item) => ({
            ...item,
            type: 'item',
            breadcrumbs: false
          }))
      }
    ]
  };
}

export default getMenuItems;

