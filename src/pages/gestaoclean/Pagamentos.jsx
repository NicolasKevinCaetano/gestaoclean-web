import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { api } from 'services/api';

const STATUS = ['PENDENTE', 'PAGO', 'CANCELADO'];
const ROTULOS = { PENDENTE: 'Pendente', PAGO: 'Pago', CANCELADO: 'Cancelado' };
const CORES = { PENDENTE: 'warning', PAGO: 'success', CANCELADO: 'default' };
const dinheiro = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
const dataBR = (valor) => {
  if (!valor) return '—';
  const [data, hora] = String(valor).split('T');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return String(valor);
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
};
const lista = (resposta) => Array.isArray(resposta) ? resposta : Array.isArray(resposta?.content) ? resposta.content : [];
const mensagem = (erro) => erro?.message || 'Não foi possível concluir a operação.';
const novaFicha = () => ({ ordemServicoId: '', valor: '', formaPagamento: '', observacoes: '' });

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [filtro, setFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [dialogNovo, setDialogNovo] = useState(false);
  const [formulario, setFormulario] = useState(novaFicha);
  const [erroDialog, setErroDialog] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);

  // Não existe GET /pagamentos na API: consultar por status é a forma oficial de obter todos.
  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      const [resultados, os] = await Promise.all([
        filtro ? Promise.all([api(`/pagamentos/status/${filtro}`)]) : Promise.all(STATUS.map(s => api(`/pagamentos/status/${s}`))),
        api('/ordens-servico')
      ]);
      const unicos = new Map();
      resultados.flatMap(lista).forEach(p => unicos.set(String(p.id), p));
      setPagamentos([...unicos.values()].sort((a, b) => Number(b.id) - Number(a.id)));
      setOrdens(lista(os));
    } catch (e) { setErro(`Não foi possível carregar os pagamentos: ${mensagem(e)}`); }
    finally { setCarregando(false); }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setFormulario(novaFicha()); setErroDialog(''); setDialogNovo(true); };
  const mudar = (campo, valor) => setFormulario(atual => ({ ...atual, [campo]: valor }));
  const criar = async (evento) => {
    evento.preventDefault(); setErroDialog('');
    const id = Number(formulario.ordemServicoId);
    const valor = Number(formulario.valor);
    if (!Number.isInteger(id) || id <= 0) { setErroDialog('Selecione uma Ordem de Serviço.'); return; }
    if (!Number.isFinite(valor) || valor <= 0) { setErroDialog('Informe um valor maior que zero.'); return; }
    setSalvando(true);
    try {
      await api(`/pagamentos/ordem-servico/${id}`, {
        method: 'POST',
        body: JSON.stringify({ valor, formaPagamento: formulario.formaPagamento.trim(), observacoes: formulario.observacoes.trim() })
      });
      setDialogNovo(false); setSucesso('Pagamento registrado com sucesso.'); await carregar();
    } catch (e) { setErroDialog(mensagem(e)); }
    finally { setSalvando(false); }
  };
  const abrirDetalhe = async (pagamento) => {
    setErro('');
    try { setDetalhe(await api(`/pagamentos/${pagamento.id}`)); }
    catch (e) { setErro(`Não foi possível consultar o pagamento: ${mensagem(e)}`); }
  };
  const executarAcao = async () => {
    if (!confirmacao) return;
    setSalvando(true); setErroDialog('');
    try {
      const { id, acao } = confirmacao;
      await api(`/pagamentos/${id}/${acao}`, { method: 'PUT' });
      setConfirmacao(null);
      setSucesso(acao === 'pagar' ? 'Pagamento marcado como pago.' : 'Pagamento cancelado.');
      await carregar();
    } catch (e) { setErroDialog(mensagem(e)); }
    finally { setSalvando(false); }
  };

  const visiveis = useMemo(() => pagamentos.filter(p =>
    [p.id, p.ordemServicoId, p.clienteNome, p.clienteId, p.status, p.formaPagamento, p.observacoes]
      .join(' ').toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))
  ), [pagamentos, busca]);
  const totais = useMemo(() => STATUS.reduce((acc, s) => {
    const registros = pagamentos.filter(p => p.status === s);
    acc[s] = { quantidade: registros.length, valor: registros.reduce((total, p) => total + (Number(p.valor) || 0), 0) };
    return acc;
  }, {}), [pagamentos]);
  const osSelecionada = ordens.find(o => String(o.id) === String(formulario.ordemServicoId));

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4">Pagamentos</Typography>
        <Typography color="text.secondary">Controle os recebimentos vinculados às Ordens de Serviço da Higienizei.</Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}>
        <Button variant="contained" onClick={abrirNovo}>Novo pagamento</Button>
        <Button variant="outlined" onClick={carregar}>Atualizar</Button>
      </Stack>
    </Stack>
    {sucesso && <Alert severity="success" onClose={() => setSucesso('')}>{sucesso}</Alert>}
    {erro && <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert>}
    <Alert severity="info">Os totais consideram os pagamentos carregados conforme o filtro de status selecionado.</Alert>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {STATUS.map(s => <Paper key={s} variant="outlined" sx={{ p: 2, flex: 1 }}>
        <Typography color="text.secondary" variant="body2">{ROTULOS[s]} · {totais[s].quantidade}</Typography>
        <Typography variant="h5">{dinheiro(totais[s].valor)}</Typography>
      </Paper>)}
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField size="small" label="Pesquisar cliente, OS ou forma" value={busca} onChange={e => setBusca(e.target.value)} sx={{ minWidth: 260 }} />
      <TextField select size="small" label="Filtrar por status" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 190 }}>
        <MenuItem value="">Todos os status</MenuItem>
        {STATUS.map(s => <MenuItem key={s} value={s}>{ROTULOS[s]}</MenuItem>)}
      </TextField>
    </Stack>
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead><TableRow>
          <TableCell>ID</TableCell><TableCell>Ordem de Serviço</TableCell><TableCell>Cliente</TableCell>
          <TableCell>Valor</TableCell><TableCell>Forma</TableCell><TableCell>Data do pagamento</TableCell>
          <TableCell>Status</TableCell><TableCell align="right">Ações</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {carregando ? <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
            : visiveis.length === 0 ? <TableRow><TableCell colSpan={8} align="center">Nenhum pagamento encontrado.</TableCell></TableRow>
              : visiveis.map(p => <TableRow key={p.id} hover>
                <TableCell>#{p.id}</TableCell><TableCell>#{p.ordemServicoId}</TableCell>
                <TableCell>{p.clienteNome || `Cliente #${p.clienteId}`}</TableCell>
                <TableCell>{dinheiro(p.valor)}</TableCell><TableCell>{p.formaPagamento || '—'}</TableCell>
                <TableCell>{dataBR(p.dataPagamento)}</TableCell>
                <TableCell><Chip size="small" color={CORES[p.status] || 'default'} label={ROTULOS[p.status] || p.status || '—'} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                    <Button size="small" onClick={() => abrirDetalhe(p)}>Detalhes</Button>
                    {p.status === 'PENDENTE' && <>
                      <Button size="small" color="success" onClick={() => { setErroDialog(''); setConfirmacao({ id: p.id, acao: 'pagar' }); }}>Marcar pago</Button>
                      <Button size="small" color="error" onClick={() => { setErroDialog(''); setConfirmacao({ id: p.id, acao: 'cancelar' }); }}>Cancelar</Button>
                    </>}
                  </Stack>
                </TableCell>
              </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>

    <Dialog open={dialogNovo} onClose={() => !salvando && setDialogNovo(false)} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={criar}>
        <DialogTitle>Novo pagamento</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          {erroDialog && <Alert severity="error">{erroDialog}</Alert>}
          <TextField select fullWidth required label="Ordem de Serviço" value={formulario.ordemServicoId} onChange={e => mudar('ordemServicoId', e.target.value)}>
            {ordens.length === 0 && <MenuItem value="" disabled>Nenhuma OS disponível</MenuItem>}
            {ordens.map(o => <MenuItem key={o.id} value={String(o.id)}>
              {`OS #${o.id} · ${o.clienteNome || `Cliente #${o.clienteId}`} · ${dinheiro(o.valorTotal)} · ${o.status || '—'}`}
            </MenuItem>)}
          </TextField>
          {osSelecionada && <Alert severity="info">Valor total da OS: {dinheiro(osSelecionada.valorTotal)}. Informe o valor deste pagamento.</Alert>}
          <TextField fullWidth required label="Valor (R$)" type="number" inputProps={{ min: '0.01', step: '0.01' }} value={formulario.valor} onChange={e => mudar('valor', e.target.value)} />
          <TextField fullWidth label="Forma de pagamento" placeholder="Ex.: Pix, dinheiro, cartão" value={formulario.formaPagamento} onChange={e => mudar('formaPagamento', e.target.value)} />
          <TextField fullWidth label="Observações" multiline minRows={3} value={formulario.observacoes} onChange={e => mudar('observacoes', e.target.value)} />
        </Stack></DialogContent>
        <DialogActions><Button disabled={salvando} onClick={() => setDialogNovo(false)}>Voltar</Button><Button disabled={salvando || !ordens.length} type="submit" variant="contained">{salvando ? 'Salvando...' : 'Registrar pagamento'}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(detalhe)} onClose={() => setDetalhe(null)} fullWidth maxWidth="sm">
      <DialogTitle>Detalhes do pagamento #{detalhe?.id}</DialogTitle>
      <DialogContent><Stack spacing={1.5} sx={{ mt: 1 }}>
        {detalhe && <>
          <Typography><strong>Cliente:</strong> {detalhe.clienteNome || `#${detalhe.clienteId}`}</Typography>
          <Typography><strong>Ordem de Serviço:</strong> #{detalhe.ordemServicoId}</Typography>
          <Typography><strong>Valor:</strong> {dinheiro(detalhe.valor)}</Typography>
          <Typography><strong>Status:</strong> {ROTULOS[detalhe.status] || detalhe.status}</Typography>
          <Typography><strong>Data do pagamento:</strong> {dataBR(detalhe.dataPagamento)}</Typography>
          <Typography><strong>Forma:</strong> {detalhe.formaPagamento || '—'}</Typography>
          <Divider />
          <Typography><strong>Observações:</strong> {detalhe.observacoes || '—'}</Typography>
        </>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setDetalhe(null)}>Fechar</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(confirmacao)} onClose={() => !salvando && setConfirmacao(null)} fullWidth maxWidth="xs">
      <DialogTitle>{confirmacao?.acao === 'pagar' ? 'Confirmar recebimento' : 'Cancelar pagamento'}</DialogTitle>
      <DialogContent><Stack spacing={2}>
        {erroDialog && <Alert severity="error">{erroDialog}</Alert>}
        <Typography>{confirmacao?.acao === 'pagar'
          ? `Deseja marcar o pagamento #${confirmacao?.id} como pago?`
          : `Deseja cancelar o pagamento #${confirmacao?.id}?`}</Typography>
      </Stack></DialogContent>
      <DialogActions>
        <Button disabled={salvando} onClick={() => setConfirmacao(null)}>Voltar</Button>
        <Button disabled={salvando} variant="contained" color={confirmacao?.acao === 'cancelar' ? 'error' : 'success'} onClick={executarAcao}>
          {salvando ? 'Processando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  </Stack>;
}
