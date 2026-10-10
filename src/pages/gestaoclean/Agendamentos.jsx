import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from 'services/api';

const dinheiro = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
const dataBR = (valor) => valor ? new Date(valor).toLocaleString('pt-BR') : '—';
const localDateTime = (valor) => valor ? String(valor).slice(0, 16) : '';
const novoItem = () => ({ servico: '', valor: '' });
const novoFormulario = () => ({ clienteId: '', dataAgendamento: '', observacoes: '', itens: [novoItem()] });
const statusColor = (status) => /CANCELAD/i.test(status || '') ? 'default' : /REALIZAD|CONCLUID/i.test(status || '') ? 'success' : 'primary';
const statusLabel = (status) => status ? String(status).replaceAll('_', ' ') : '—';
const message = (erro) => erro?.message || 'Não foi possível concluir a operação.';

export default function Agendamentos() {
  const [registros, setRegistros] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [statusDisponiveis, setStatusDisponiveis] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(novoFormulario);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');
  const [carregandoClientes, setCarregandoClientes] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      if (filtroData) params.set('data', filtroData);
      if (filtroStatus) params.set('status', filtroStatus);
      const resultado = await api(`/agendamentos${params.size ? `?${params}` : ''}`);
      const lista = Array.isArray(resultado) ? resultado : Array.isArray(resultado?.content) ? resultado.content : [];
      setRegistros(lista);
      setStatusDisponiveis(anteriores => [...new Set([...anteriores, ...lista.map(r => r.status).filter(Boolean)])]);
    } catch (e) { setErro(message(e)); }
    finally { setLoading(false); }
  }, [filtroData, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const carregarClientes = async () => {
    setCarregandoClientes(true);
    try {
      const resultado = await api('/clientes');
      setClientes(Array.isArray(resultado) ? resultado : Array.isArray(resultado?.content) ? resultado.content : []);
    } catch (e) { setErroFormulario(`Não foi possível carregar os clientes: ${message(e)}`); }
    finally { setCarregandoClientes(false); }
  };

  const abrirNovo = () => {
    setEditando(null); setForm(novoFormulario()); setErroFormulario(''); setAberto(true);
    carregarClientes();
  };
  const abrirEdicao = async (registro) => {
    setErro(''); setErroFormulario('');
    try {
      const completo = await api(`/agendamentos/${registro.id}`);
      setEditando(completo.id);
      setForm({
        clienteId: String(completo.clienteId ?? ''),
        dataAgendamento: localDateTime(completo.dataAgendamento),
        observacoes: completo.observacoes || '',
        itens: Array.isArray(completo.itens) && completo.itens.length
          ? completo.itens.map(i => ({ servico: i.servico || '', valor: i.valor == null ? '' : String(i.valor) }))
          : [novoItem()]
      });
      setAberto(true); carregarClientes();
    } catch (e) { setErro(`Não foi possível abrir o agendamento: ${message(e)}`); }
  };
  const abrirDetalhe = async (registro) => {
    setErro('');
    try { setDetalhe(await api(`/agendamentos/${registro.id}`)); }
    catch (e) { setErro(message(e)); }
  };
  const mudarItem = (indice, campo, valor) => setForm(anterior => ({
    ...anterior, itens: anterior.itens.map((item, i) => i === indice ? { ...item, [campo]: valor } : item)
  }));
  const total = useMemo(() => form.itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0), [form.itens]);
  const salvar = async (evento) => {
    evento.preventDefault();
    setErroFormulario('');
    if (!form.clienteId || !form.dataAgendamento) { setErroFormulario('Selecione um cliente, uma data e um horário.'); return; }
    if (!form.itens.length || form.itens.some(item => !item.servico.trim() || !Number.isFinite(Number(item.valor)) || Number(item.valor) <= 0)) {
      setErroFormulario('Informe o nome e um valor maior que zero para cada serviço.'); return;
    }
    setSalvando(true);
    try {
      const corpo = {
        clienteId: Number(form.clienteId),
        dataAgendamento: `${form.dataAgendamento}:00`,
        itens: form.itens.map(item => ({ servico: item.servico.trim(), valor: Number(item.valor) })),
        observacoes: form.observacoes
      };
      await api(editando ? `/agendamentos/${editando}` : '/agendamentos', {
        method: editando ? 'PUT' : 'POST', body: JSON.stringify(corpo)
      });
      setAberto(false); setSucesso(editando ? 'Agendamento atualizado com sucesso.' : 'Agendamento cadastrado com sucesso.');
      await carregar();
    } catch (e) { setErroFormulario(message(e)); }
    finally { setSalvando(false); }
  };
  const cancelar = async (registro) => {
    if (!window.confirm(`Cancelar o agendamento #${registro.id} de ${registro.clienteNome || 'cliente'}?`)) return;
    setErro('');
    try { await api(`/agendamentos/${registro.id}/cancelar`, { method: 'PATCH' }); setSucesso('Agendamento cancelado.'); await carregar(); }
    catch (e) { setErro(message(e)); }
  };
  const excluir = async (registro) => {
    if (!window.confirm(`Excluir definitivamente o agendamento #${registro.id}? Essa ação pode ser irreversível.`)) return;
    setErro('');
    try { await api(`/agendamentos/${registro.id}`, { method: 'DELETE' }); setSucesso('Agendamento excluído.'); await carregar(); }
    catch (e) { setErro(message(e)); }
  };
  const visiveis = registros.filter(registro => [registro.id, registro.clienteNome, registro.status,
    registro.observacoes, ...(registro.itens || []).map(item => item.servico)].some(v => String(v ?? '').toLocaleLowerCase('pt-BR').includes(pesquisa.toLocaleLowerCase('pt-BR'))));

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
      <Box><Typography variant="h4">Agendamentos</Typography><Typography color="text.secondary">Atendimentos e serviços da Higienizei</Typography></Box>
      <Stack direction="row" spacing={1}><Button variant="contained" onClick={abrirNovo}>Novo agendamento</Button><Button variant="outlined" onClick={carregar}>Atualizar</Button></Stack>
    </Stack>
    {sucesso && <Alert severity="success" onClose={() => setSucesso('')}>{sucesso}</Alert>}
    {erro && <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      <TextField size="small" label="Pesquisar cliente ou serviço" value={pesquisa} onChange={e => setPesquisa(e.target.value)} sx={{ minWidth: 220, flex: 1 }} />
      <TextField size="small" type="date" label="Data" value={filtroData} onChange={e => setFiltroData(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 165 }} />
      <TextField size="small" select label="Status" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} sx={{ minWidth: 170 }}>
        <MenuItem value="">Todos</MenuItem>
        {statusDisponiveis.map(s => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
      </TextField>
      {(filtroData || filtroStatus || pesquisa) && <Button onClick={() => { setFiltroData(''); setFiltroStatus(''); setPesquisa(''); }}>Limpar filtros</Button>}
    </Stack>
    {loading ? <CircularProgress /> : <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small"><TableHead><TableRow>
        {['ID', 'Cliente', 'Data e horário', 'Serviços', 'Total', 'Status', 'Ações'].map(c => <TableCell key={c} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</TableCell>)}
      </TableRow></TableHead><TableBody>
        {visiveis.map(r => <TableRow key={r.id} hover>
          <TableCell>#{r.id}</TableCell><TableCell>{r.clienteNome || `Cliente #${r.clienteId}`}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{dataBR(r.dataAgendamento)}</TableCell>
          <TableCell><Box sx={{ maxWidth: 250 }}>{Array.isArray(r.itens) && r.itens.length ? r.itens.map(i => i.servico).join(', ') : '—'}</Box></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{dinheiro(r.valorTotal)}</TableCell>
          <TableCell><Chip size="small" color={statusColor(r.status)} variant="outlined" label={statusLabel(r.status)} /></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => abrirDetalhe(r)}>Detalhes</Button>
            {!/CANCELAD/i.test(r.status || '') && <><Button size="small" onClick={() => abrirEdicao(r)}>Editar</Button><Button size="small" color="warning" onClick={() => cancelar(r)}>Cancelar</Button></>}
            <Button size="small" color="error" onClick={() => excluir(r)}>Excluir</Button>
          </TableCell>
        </TableRow>)}
        {!visiveis.length && <TableRow><TableCell colSpan={7}>Nenhum agendamento encontrado.</TableCell></TableRow>}
      </TableBody></Table>
    </TableContainer>}

    <Dialog open={aberto} onClose={() => !salvando && setAberto(false)} fullWidth maxWidth="md">
      <Box component="form" onSubmit={salvar}>
        <DialogTitle>{editando ? `Editar agendamento #${editando}` : 'Novo agendamento'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          {erroFormulario && <Alert severity="error">{erroFormulario}</Alert>}
          <TextField select required fullWidth label="Cliente" value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))} disabled={carregandoClientes} helperText={carregandoClientes ? 'Carregando clientes...' : !clientes.length ? 'Nenhum cliente disponível. Cadastre um cliente antes de agendar.' : ''}>
            {clientes.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nome || `Cliente #${c.id}`}</MenuItem>)}
            {form.clienteId && !clientes.some(c => String(c.id) === form.clienteId) && <MenuItem value={form.clienteId}>Cliente #{form.clienteId}</MenuItem>}
          </TextField>
          <TextField required fullWidth type="datetime-local" label="Data e horário" value={form.dataAgendamento} onChange={e => setForm(f => ({ ...f, dataAgendamento: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <Divider /><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6">Serviços</Typography><Button startIcon={<PlusOutlined />} onClick={() => setForm(f => ({ ...f, itens: [...f.itens, novoItem()] }))}>Adicionar serviço</Button></Stack>
          {form.itens.map((item, indice) => <Stack key={indice} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField required fullWidth label={`Serviço ${indice + 1}`} value={item.servico} onChange={e => mudarItem(indice, 'servico', e.target.value)} />
            <TextField required label="Valor (R$)" type="number" value={item.valor} onChange={e => mudarItem(indice, 'valor', e.target.value)} inputProps={{ min: 0.01, step: 0.01 }} sx={{ minWidth: 150 }} />
            <IconButton aria-label={`Remover serviço ${indice + 1}`} color="error" disabled={form.itens.length === 1} onClick={() => setForm(f => ({ ...f, itens: f.itens.filter((_, i) => i !== indice) }))}><DeleteOutlined /></IconButton>
          </Stack>)}
          <Typography variant="h5" textAlign="right">Total: {dinheiro(total)}</Typography>
          <TextField fullWidth multiline minRows={2} label="Observações" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setAberto(false)} disabled={salvando}>Voltar</Button><Button type="submit" variant="contained" disabled={salvando || carregandoClientes}>{salvando ? 'Salvando...' : 'Salvar agendamento'}</Button></DialogActions>
      </Box>
    </Dialog>
    <Dialog open={Boolean(detalhe)} onClose={() => setDetalhe(null)} fullWidth maxWidth="sm">
      <DialogTitle>Agendamento #{detalhe?.id}</DialogTitle><DialogContent><Stack spacing={1} sx={{ pt: 1 }}>
        <Typography><strong>Cliente:</strong> {detalhe?.clienteNome || `#${detalhe?.clienteId}`}</Typography>
        <Typography><strong>Data:</strong> {dataBR(detalhe?.dataAgendamento)}</Typography>
        <Typography><strong>Status:</strong> {statusLabel(detalhe?.status)}</Typography>
        <Typography><strong>Observações:</strong> {detalhe?.observacoes || '—'}</Typography>
        <Divider /><Typography variant="h6">Serviços</Typography>
        {(detalhe?.itens || []).map((item, i) => <Stack key={i} direction="row" justifyContent="space-between" gap={2}><Typography>{item.servico || 'Serviço'}</Typography><Typography>{dinheiro(item.valor)}</Typography></Stack>)}
        <Divider /><Typography variant="h5" textAlign="right">Total: {dinheiro(detalhe?.valorTotal)}</Typography>
      </Stack></DialogContent><DialogActions><Button onClick={() => setDetalhe(null)}>Fechar</Button></DialogActions>
    </Dialog>
  </Stack>;
}
