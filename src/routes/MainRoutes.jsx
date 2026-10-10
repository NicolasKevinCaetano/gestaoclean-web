import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import DashboardLayout from 'layout/Dashboard';
import { getToken, getRole, ensureRole } from 'services/api';
import Dashboard from 'pages/gestaoclean/Dashboard';
import Resource from 'pages/gestaoclean/Resource';
import Agendamentos from 'pages/gestaoclean/Agendamentos';
import OrdensServico from 'pages/gestaoclean/OrdensServico';
import Pagamentos from 'pages/gestaoclean/Pagamentos';
import Despesas from 'pages/gestaoclean/Despesas';
import Usuarios from 'pages/gestaoclean/Usuarios';
function PrivateLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    ensureRole().finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  if (!getToken()) return <Navigate to="/login" replace />;
  if (!ready) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  return <DashboardLayout />;
}
function AdminOnly({children}){return /ADMIN/i.test(getRole())?children:<Navigate to="/agendamentos" replace/>;}
const MainRoutes={path:'/',element:<PrivateLayout/>,children:[
 {index:true,element:<AdminOnly><Dashboard/></AdminOnly>},
 {path:'dashboard/default',element:<AdminOnly><Dashboard/></AdminOnly>},
 {path:'agendamentos',element:<Agendamentos/>},
 {path:'ordens-servico',element:<OrdensServico/>},
 {path:'pagamentos',element:<AdminOnly><Pagamentos/></AdminOnly>},
 {path:'despesas',element:<AdminOnly><Despesas/></AdminOnly>},
 {path:'usuarios',element:<AdminOnly><Usuarios/></AdminOnly>},
 ...['clientes'].map(resource=>({path:resource,element:<Resource resource={resource}/> }))
]};
export default MainRoutes;
