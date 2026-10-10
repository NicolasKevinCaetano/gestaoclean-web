import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { api } from 'services/api';

const STATUS = ['ABERTA', 'EM_EXECUCAO', 'FINALIZADA', 'CANCELADA'];
const ROTULOS = { ABERTA: 'Aberta', EM_EXECUCAO: 'Em execução', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' };
const COR = { ABERTA: 'primary', EM_EXECUCAO: 'warning', FINALIZADA: 'success', CANCELADA: 'default' };
const dinheiro = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const dataBR = (v) => {
  if (!v) return '—';
  const texto = String(v);
  const [data, hora] = texto.split('T');
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return texto;
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
};
const mensagem = (e) => e?.message || 'Não foi possível concluir a operação.';
const extrairLista = (r) => Array.isArray(r) ? r : Array.isArray(r?.content) ? r.content : [];
const descricaoAgendamento = (a) => `#${a.id} · ${a.clienteNome || `Cliente #${a.clienteId}`} · ${dataBR(a.dataAgendamento)}${a.valorTotal != null ? ` · ${dinheiro(a.valorTotal)}` : ''}`;

export default function OrdensServico() {
  const [ordens, setOrdens] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [dialogNovo, setDialogNovo] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroDialog, setErroDialog] = useState('');
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [statusDialog, setStatusDialog] = useState(null);
  const [novoStatus, setNovoStatus] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const url = `/ordens-servico${filtroStatus ? `?status=${encodeURIComponent(filtroStatus)}` : ''}`;
      setOrdens(extrairLista(await api(url)));
    } catch (e) { setErro(mensagem(e)); }
    finally { setCarregando(false); }
  }, [filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = async () => {
    setAgendamentoId(''); setObservacoes(''); setErroDialog(''); setDialogNovo(true);
    setCarregandoAgendamentos(true);
    try {
      const [agendas, os] = await Promise.all([api('/agendamentos'), api('/ordens-servico')]);
      setAgendamentos(extrairLista(agendas));
      // Use the full list even when a status filter is active to prevent duplicate OS selection.
      const ids = new Set(extrairLista(os).map(o => String(o.agendamentoId)));
      const livres = extrairLista(agendas).filter(a => !ids.has(String(a.id)) && !/^CANCELAD/.test(a.status || ''));
      setAgendamentos(livres);
    } catch (e) { setErroDialog(`Não foi possível carregar os agendamentos: ${mensagem(e)}`); }
    finally { setCarregandoAgendamentos(false); }
  };

  const criar = async (evento) => {
    evento.preventDefault(); setErroDialog('');
    if (!agendamentoId) { setErroDialog('Selecione um agendamento.'); return; }
    setSalvando(true);
    try {
      await api('/ordens-servico', { method: 'POST', body: JSON.stringify({ agendamentoId: Number(agendamentoId), observacoes }) });
      setDialogNovo(false); setSucesso('Ordem de Serviço criada com sucesso.'); await carregar();
    } catch (e) { setErroDialog(mensagem(e)); }
    finally { setSalvando(false); }
  };

  const abrirDetalhe = async (ordem) => {
    setErro('');
    try { setDetalhe(await api(`/ordens-servico/${ordem.id}`)); }
    catch (e) { setErro(`Não foi possível consultar a OS: ${mensagem(e)}`); }
  };

  const abrirStatus = (ordem) => {
    setStatusDialog(ordem); setNovoStatus(ordem.status || ''); setErroDialog('');
  };

  const alterarStatus = async (evento) => {
    evento.preventDefault(); setErroDialog('');
    if (!STATUS.includes(novoStatus)) { setErroDialog('Selecione um status válido.'); return; }
    if (novoStatus === statusDialog?.status) { setStatusDialog(null); return; }
    setSalvando(true);
    try {
      await api(`/ordens-servico/${statusDialog.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) });
      setStatusDialog(null); setSucesso('Status da Ordem de Serviço atualizado.'); await carregar();
    } catch (e) { setErroDialog(mensagem(e)); }
    finally { setSalvando(false); }
  };

  const visiveis = useMemo(() => ordens.filter(o => {
    const texto = [o.id, o.agendamentoId, o.clienteNome, o.clienteId, o.status, o.observacoes,
      ...(Array.isArray(o.itens) ? o.itens.map(i => i.servico) : [])].join(' ').toLocaleLowerCase('pt-BR');
    return texto.includes(busca.toLocaleLowerCase('pt-BR'));
  }), [ordens, busca]);

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
      <Box><Typography variant="h4">Ordens de Serviço</Typography><Typography color="text.secondary">Acompanhe a execução dos atendimentos da Higienizei.</Typography></Box>
      <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="contained" onClick={abrirNovo}>Nova OS</Button><Button variant="outlined" onClick={carregar}>Atualizar</Button></Stack>
    </Stack>
    {sucesso && <Alert severity="success" onClose={() => setSucesso('')}>{sucesso}</Alert>}
    {erro && <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField size="small" label="Pesquisar OS, cliente ou serviço" value={busca} onChange={e => setBusca(e.target.value)} sx={{ minWidth: 270 }} />
      <TextField size="small" select label="Filtrar por status" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} sx={{ minWidth: 190 }}>
        <MenuItem value="">Todos os status</MenuItem>{STATUS.map(s => <MenuItem key={s} value={s}>{ROTULOS[s]}</MenuItem>)}
      </TextField>
    </Stack>
    {carregando ? <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box> :
      <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>
        {['OS', 'Cliente', 'Agendamento', 'Serviços', 'Valor total', 'Status', 'Ações'].map(c => <TableCell key={c} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</TableCell>)}
      </TableRow></TableHead><TableBody>
        {visiveis.map(o => <TableRow key={o.id} hover>
          <TableCell>#{o.id}</TableCell><TableCell>{o.clienteNome || `Cliente #${o.clienteId}`}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{dataBR(o.dataAgendamento)}</TableCell>
          <TableCell><Box sx={{ maxWidth: 240 }}>{Array.isArray(o.itens) && o.itens.length ? o.itens.map(i => i.servico).join(', ') : '—'}</Box></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{dinheiro(o.valorTotal)}</TableCell>
          <TableCell><Chip size="small" variant="outlined" color={COR[o.status] || 'default'} label={ROTULOS[o.status] || o.status || '—'} /></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => abrirDetalhe(o)}>Detalhes</Button><Button size="small" onClick={() => abrirStatus(o)}>Alterar status</Button></TableCell>
        </TableRow>)}
        {!visiveis.length && <TableRow><TableCell colSpan={7}>Nenhuma Ordem de Serviço encontrada.</TableCell></TableRow>}
      </TableBody></Table></TableContainer>}

    <Dialog open={dialogNovo} onClose={() => !salvando && setDialogNovo(false)} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={criar}><DialogTitle>Nova Ordem de Serviço</DialogTitle><DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {erroDialog && <Alert severity="error">{erroDialog}</Alert>}
          <TextField select required fullWidth label="Agendamento" value={agendamentoId} onChange={e => setAgendamentoId(e.target.value)} disabled={carregandoAgendamentos} helperText={carregandoAgendamentos ? 'Carregando agendamentos...' : !agendamentos.length ? 'Nenhum agendamento disponível. Verifique se já existe uma OS ou se o agendamento foi cancelado.' : 'Selecione um agendamento que ainda não possui OS.'}>
            {agendamentos.map(a => <MenuItem key={a.id} value={String(a.id)}>{descricaoAgendamento(a)}</MenuItem>)}
          </TextField>
          <TextField fullWidth multiline minRows={3} label="Observações da OS" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </Stack></DialogContent><DialogActions><Button disabled={salvando} onClick={() => setDialogNovo(false)}>Voltar</Button><Button variant="contained" type="submit" disabled={salvando || carregandoAgendamentos || !agendamentoId}>{salvando ? 'Criando...' : 'Criar OS'}</Button></DialogActions></Box>
    </Dialog>

    <Dialog open={Boolean(detalhe)} onClose={() => setDetalhe(null)} fullWidth maxWidth="sm">
      <DialogTitle>Ordem de Serviço #{detalhe?.id}</DialogTitle><DialogContent><Stack spacing={1} sx={{ pt: 1 }}>
        <Typography><strong>Agendamento:</strong> #{detalhe?.agendamentoId}</Typography>
        <Typography><strong>Cliente:</strong> {detalhe?.clienteNome || `#${detalhe?.clienteId}`}</Typography>
        <Typography><strong>Data do atendimento:</strong> {dataBR(detalhe?.dataAgendamento)}</Typography>
        <Typography><strong>Criação da OS:</strong> {dataBR(detalhe?.dataCriacao)}</Typography>
        <Typography><strong>Status:</strong> {ROTULOS[detalhe?.status] || detalhe?.status || '—'}</Typography>
        <Typography><strong>Observações:</strong> {detalhe?.observacoes || '—'}</Typography>
        <Divider /><Typography variant="h6">Serviços</Typography>
        {Array.isArray(detalhe?.itens) && detalhe.itens.length ? detalhe.itens.map((i, n) => <Stack key={n} direction="row" justifyContent="space-between" gap={2}><Typography>{i.servico}</Typography><Typography sx={{ whiteSpace: 'nowrap' }}>{dinheiro(i.valor)}</Typography></Stack>) : <Typography color="text.secondary">Nenhum serviço informado.</Typography>}
        <Divider /><Typography variant="h6" textAlign="right">Total: {dinheiro(detalhe?.valorTotal)}</Typography>
      </Stack></DialogContent><DialogActions><Button onClick={() => setDetalhe(null)}>Fechar</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(statusDialog)} onClose={() => !salvando && setStatusDialog(null)} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={alterarStatus}><DialogTitle>Alterar status da OS #{statusDialog?.id}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {erroDialog && <Alert severity="error">{erroDialog}</Alert>}
        <Typography color="text.secondary">Status atual: {ROTULOS[statusDialog?.status] || '—'}</Typography>
        <TextField select required fullWidth label="Novo status" value={novoStatus} onChange={e => setNovoStatus(e.target.value)}>
          {STATUS.map(s => <MenuItem key={s} value={s}>{ROTULOS[s]}</MenuItem>)}
        </TextField>
        <Typography variant="caption" color="text.secondary">A API validará se a transição de status é permitida.</Typography>
      </Stack></DialogContent><DialogActions><Button disabled={salvando} onClick={() => setStatusDialog(null)}>Voltar</Button><Button variant="contained" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar status'}</Button></DialogActions></Box>
    </Dialog>
  </Stack>;
}
